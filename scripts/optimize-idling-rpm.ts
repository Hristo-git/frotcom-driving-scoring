import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';

const CATEGORY_THRESHOLDS = {
    harshAccelerationLow: [
        { max: 0.08, score: 10 }, { max: 0.35, score: 9 }, { max: 0.80, score: 8 },
        { max: 1.30, score: 7 }, { max: 2.00, score: 6 }, { max: 2.85, score: 5 },
        { max: 3.85, score: 4 }, { max: 5.50, score: 3 }, { max: 9.00, score: 2 }
    ],
    harshAccelerationHigh: [
        { max: 0.03, score: 10 }, { max: 0.08, score: 9 }, { max: 0.20, score: 8 },
        { max: 0.28, score: 7 }, { max: 0.45, score: 6 }, { max: 0.65, score: 5 },
        { max: 1.15, score: 4 }, { max: 1.60, score: 3 }, { max: 2.65, score: 2 }
    ],
    harshBrakingLow: [
        { max: 0.30, score: 10 }, { max: 0.80, score: 9 }, { max: 1.35, score: 8 },
        { max: 1.75, score: 7 }, { max: 2.30, score: 6 }, { max: 3.00, score: 5 },
        { max: 3.90, score: 4 }, { max: 4.90, score: 3 }, { max: 7.50, score: 2 }
    ],
    harshBrakingHigh: [
        { max: 0.05, score: 10 }, { max: 0.10, score: 9 }, { max: 0.19, score: 8 },
        { max: 0.30, score: 7 }, { max: 0.42, score: 6 }, { max: 0.56, score: 5 },
        { max: 0.83, score: 4 }, { max: 1.21, score: 3 }, { max: 1.90, score: 2 }
    ],
    harshCornering: [
        { max: 0.25, score: 10 }, { max: 1.20, score: 9 }, { max: 3.85, score: 8 },
        { max: 7.70, score: 7 }, { max: 13.70, score: 6 }, { max: 19.70, score: 5 },
        { max: 23.50, score: 4 }, { max: 35.20, score: 3 }, { max: 45.00, score: 2 }
    ]
};

async function verifyDriver(driverId: number, name: string, start: string, end: string, dbStart: string, dbEnd: string) {
    // Get DB Official
    const dbRes = await pool.query(`
        SELECT 
            SUM(overall_score * (metrics->>'mileage')::float) / NULLIF(SUM((metrics->>'mileage')::float), 0) as weighted_official_score
        FROM ecodriving_scores
        WHERE driver_id = $1 AND period_start >= $2 AND period_start <= $3
    `, [driverId, dbStart, dbEnd]);
    
    if (dbRes.rows.length === 0 || dbRes.rows[0].weighted_official_score === null) return null;
    
    const target = parseFloat(dbRes.rows[0].weighted_official_score);

    // Get Raw counts directly to manually test them against new rules
    const eventsRes = await pool.query(`
        SELECT key as event_type, SUM(value::int) as total_count
        FROM ecodriving_scores,
             jsonb_each_text(metrics->'eventCounts')
        WHERE driver_id = $1 AND period_start >= $2 AND period_start <= $3
        GROUP BY key
    `, [driverId, dbStart, dbEnd]);

    const metricsRes = await pool.query(`
        SELECT 
            SUM((metrics->>'mileage')::float) as total_mileage,
            AVG((metrics->>'idleTimePerc')::float) as avg_idle,
            AVG((metrics->>'highRPMPerc')::float) as avg_rpm
        FROM ecodriving_scores
        WHERE driver_id = $1 AND period_start >= $2 AND period_start <= $3
    `, [driverId, dbStart, dbEnd]);

    // Construct raw metrics
    const rawMetrics = {
        mileage: metricsRes.rows[0].total_mileage || 0,
        idleTimePerc: metricsRes.rows[0].avg_idle || 0,
        highRPMPerc: metricsRes.rows[0].avg_rpm || 0
    };
    const counts: any = {};
    eventsRes.rows.forEach(r => counts[r.event_type] = parseInt(r.total_count));

    return { name, target, rawMetrics, counts };
}

// Function that replicates calculateCustomScore without Class dependencies so we can mutate formulas quickly
function testScore(data: any, rpmWeight: number, idleWeight: number) {
    const distRatio = data.rawMetrics.mileage / 100;

    const scores = {
        lowAccel: getScoreFromTable((data.counts.lowSpeedAcceleration || 0) / distRatio, CATEGORY_THRESHOLDS.harshAccelerationLow),
        highAccel: getScoreFromTable((data.counts.highSpeedAcceleration || 0) / distRatio, CATEGORY_THRESHOLDS.harshAccelerationHigh),
        lowBrake: getScoreFromTable((data.counts.lowSpeedBreak || 0) / distRatio, CATEGORY_THRESHOLDS.harshBrakingLow),
        highBrake: getScoreFromTable((data.counts.highSpeedBreak || 0) / distRatio, CATEGORY_THRESHOLDS.harshBrakingHigh),
        cornering: getScoreFromTable((data.counts.lateralAcceleration || 0) / distRatio, CATEGORY_THRESHOLDS.harshCornering),
        noCruise: data.counts.noCruise ? Math.max(1, 10 - ((data.counts.noCruise / distRatio) * 0.1)) : 10,
        
        // NEW High RPM mapped from array
        highRpm: getRPMScore(data.rawMetrics.highRPMPerc),
        
        // Idle (percentage mapped heuristically)
        idling: getIdleScore(data.rawMetrics.idleTimePerc)
    };

    const weights = {
        harshAccelerationLow: 0.60,
        harshAccelerationHigh: 0.60,
        harshBrakingLow: 0.75,
        harshBrakingHigh: 0.75,
        harshCornering: 0.90,
        noCruiseControl: 0.05,
        highRPM: rpmWeight,
        excessiveIdling: idleWeight
    };

    let totalScore = 0;
    let totalWeight = 0;

    totalScore += scores.lowAccel * weights.harshAccelerationLow;
    totalScore += scores.highAccel * weights.harshAccelerationHigh;
    totalScore += scores.lowBrake * weights.harshBrakingLow;
    totalScore += scores.highBrake * weights.harshBrakingHigh;
    totalScore += scores.cornering * weights.harshCornering;
    totalScore += scores.noCruise * weights.noCruiseControl;
    totalScore += scores.highRpm * weights.highRPM;
    totalScore += scores.idling * weights.excessiveIdling;

    totalWeight += weights.harshAccelerationLow;
    totalWeight += weights.harshAccelerationHigh;
    totalWeight += weights.harshBrakingLow;
    totalWeight += weights.harshBrakingHigh;
    totalWeight += weights.harshCornering;
    totalWeight += weights.noCruiseControl;
    totalWeight += weights.highRPM;
    totalWeight += weights.excessiveIdling;

    return totalScore / totalWeight;
}

function getScoreFromTable(val: number, thresholds: any[]) {
    for (const t of thresholds) {
        if (val <= t.max) return t.score;
    }
    return 1;
}

// Our parsed RPM thresholds
function getRPMScore(perc: number) {
    if (perc <= 0) return 10;
    if (perc <= 2.2) return 9;
    if (perc <= 4.3) return 8;
    if (perc <= 9.8) return 6;
    if (perc <= 14.0) return 5;
    if (perc <= 19.4) return 4;
    if (perc <= 26.4) return 3;
    if (perc <= 40.7) return 2;
    return 1;
}

// Our heuristic Idiing mapped from percentages
function getIdleScore(perc: number) {
    if (perc <= 10) return 10;
    if (perc <= 20) return 8;
    if (perc <= 30) return 6;
    if (perc <= 40) return 4;
    if (perc <= 50) return 3;
    return 1;
}

async function run() {
    const dbStart = '2026-03-01';
    const dbEnd = '2026-03-25';

    try {
        const dRes = await pool.query(`
            SELECT d.id, d.name, SUM(CAST(es.metrics->>'mileage' AS NUMERIC)) as dist
            FROM drivers d
            JOIN ecodriving_scores es ON d.id = es.driver_id
            WHERE es.period_start >= $1 AND es.period_start <= $2
              AND d.id != 18693
            GROUP BY d.id, d.name
            ORDER BY dist DESC
            LIMIT 10
        `, [dbStart, dbEnd]);
        
        let driversData = [];
        for (const d of dRes.rows) {
            const data = await verifyDriver(d.id, d.name, "", "", dbStart, dbEnd);
            if (data && data.target) driversData.push(data);
        }

        let errorSqSumZeros = 0;
        for (const d of driversData) {
            const computed = testScore(d, 0, 0);
            const diff = computed - d.target;
            errorSqSumZeros += (diff * diff);
        }
        console.log("Baseline RMS Error (Weights 0.0, 0.0):", Math.sqrt(errorSqSumZeros / driversData.length).toFixed(3));

        console.log("Analyzing combinations for Idle and RPM weights...");
        
        // Brute force weights
        let bestParams = { rpmW: 0, idleW: 0, rmse: 9999999 };
        
        const weightsToTest = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

        for (const rpm of weightsToTest) {
            for (const idle of weightsToTest) {
                let errorSqSum = 0;
                for (const d of driversData) {
                    const computed = testScore(d, rpm, idle);
                    const diff = computed - d.target;
                    errorSqSum += (diff * diff);
                }
                const rmse = Math.sqrt(errorSqSum / driversData.length);
                if (rmse < bestParams.rmse) {
                    bestParams = { rpmW: rpm, idleW: idle, rmse };
                }
            }
        }
        
        console.log("BEST PARAMETERS IDENTIFIED:");
        console.log("RPM Weight:", bestParams.rpmW);
        console.log("Idle Weight:", bestParams.idleW);
        console.log("RMS Error:", bestParams.rmse.toFixed(3));

        console.log("\nResults with BEST settings:");
        for (const d of driversData) {
            const computed = testScore(d, bestParams.rpmW, bestParams.idleW);
            console.log(`- ${d.name}: Computed (${computed.toFixed(2)}) vs Target (${d.target.toFixed(2)}) | Diff: ${(computed - d.target).toFixed(2)}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

run();
