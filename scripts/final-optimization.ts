import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';

async function test() {
    const anchors = [
        { name: 'Николай Красимиров Костадинов - Петрич', target: 4.3, dist: 4703.4 },
        { name: 'Костадин Ангелов Аклашев - Петрич', target: 7.7, dist: 7707.6 },
        { name: 'Мартин Николаев Тодоров - Петрич', target: 5.4, dist: 4158.0 }
    ];

    const engine = new ScoringEngine();
    const data: any[] = [];

    for (const a of anchors) {
        const res = await pool.query(`
            SELECT 
                metrics->>'mileage' as dist,
                metrics->'eventCounts' as events,
                CAST(metrics->>'highRPMPerc' AS NUMERIC) as rpm,
                CAST(metrics->>'idleTimePerc' AS NUMERIC) as idle,
                metrics->>'hasLowMileage' as low_mileage
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            WHERE d.name = $1
              AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= '2026-03-01'
              AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= '2026-03-27'
        `, [a.name]);
        
        data.push({ ...a, rows: res.rows });
    }

    let bestErr = Infinity;
    let bestWeights: any = null;

    console.log("Searching for the 'Holy Grail' of weights...");

    // Brute force weights for Safety vs Eco
    // We already know Safety categories have similar weights (0.7-0.9)
    // We vary the SCALE of Safety vs Eco
    for (let wSafety = 0.5; wSafety <= 3.0; wSafety += 0.1) {
        for (let wEco = 0.1; wEco <= 1.0; wEco += 0.05) {
            const weights = {
                harshAccelerationLow: wSafety,
                harshAccelerationHigh: wSafety,
                harshBrakingLow: wSafety,
                harshBrakingHigh: wSafety,
                harshCornering: wSafety,
                accelBrakeSwitch: 0,
                excessiveIdling: wEco,
                highRPM: wEco,
                alarms: 0,
                noCruiseControl: 0,
                accelDuringCruise: 0
            };

            let totalErr = 0;
            for (const d of data) {
                let totalDist = 0;
                let totalScoreW = 0;
                d.rows.forEach((r: any) => {
                    const dist = parseFloat(r.dist) || 0;
                    const m = {
                        mileage: dist,
                        eventCounts: r.events || {},
                        highRPMPerc: parseFloat(r.rpm) || 0,
                        idleTimePerc: parseFloat(r.idle) || 0,
                        hasLowMileage: r.low_mileage === 'true' || r.low_mileage === true
                    };
                    const s = engine.calculateCustomScore(m, weights);
                    totalDist += dist;
                    totalScoreW += (s * dist);
                });
                const calc = totalScoreW / totalDist;
                totalErr += Math.abs(calc - d.target);
            }

            if (totalErr < bestErr) {
                bestErr = totalErr;
                bestWeights = { wSafety, wEco };
            }
        }
    }

    console.log(`Best Avg Error: ${bestErr / 3}`);
    console.log(`Best Safety Weight: ${bestWeights.wSafety}`);
    console.log(`Best Eco Weight: ${bestWeights.wEco}`);
    
    // Check results
    data.forEach(d => {
        let totalDist = 0; let totalScoreW = 0;
        const W = { ...DEFAULT_WEIGHTS, harshAccelerationLow: bestWeights.wSafety, harshAccelerationHigh: bestWeights.wSafety, harshBrakingLow: bestWeights.wSafety, harshBrakingHigh: bestWeights.wSafety, harshCornering: bestWeights.wSafety, excessiveIdling: bestWeights.wEco, highRPM: bestWeights.wEco };
        d.rows.forEach((r: any) => {
            const dist = parseFloat(r.dist) || 0;
            const m = { mileage: dist, eventCounts: r.events || {}, highRPMPerc: parseFloat(r.rpm) || 0, idleTimePerc: parseFloat(r.idle) || 0, hasLowMileage: r.low_mileage === 'true' || r.low_mileage === true };
            const s = engine.calculateCustomScore(m, W as any);
            totalDist += dist; totalScoreW += (s * dist);
        });
        console.log(`${d.name} | Target: ${d.target} | Calc: ${(totalScoreW / totalDist).toFixed(2)}`);
    });

    await pool.end();
}

const DEFAULT_WEIGHTS = {
    harshAccelerationLow: 0.70,
    harshAccelerationHigh: 0.70,
    harshBrakingLow: 0.65,
    harshBrakingHigh: 0.75,
    harshCornering: 0.70,
    accelBrakeSwitch: 0.00,
    excessiveIdling: 0.20,
    highRPM: 0.22,
    alarms: 0.00,
    noCruiseControl: 0.00,
    accelDuringCruise: 0.00
};

test().catch(console.error);
