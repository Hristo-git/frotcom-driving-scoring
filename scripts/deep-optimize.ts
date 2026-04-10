import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';

async function test() {
    const drivers = [
        'Николай Красимиров Костадинов - Петрич', 
        'Живко Георгиев Иванов - Петрич', 
        'Костадин Ангелов Аклашев - Петрич',
        'Yordan Angelov - Русе',
        'Марјан Трајковски - Скопие'
    ];
    
    const anchorData: any[] = [];
    
    for (const name of drivers) {
        const res = await pool.query(`
            SELECT 
                CAST(metrics->>'mileage' AS NUMERIC) as dist,
                metrics->'eventCounts' as events,
                CAST(metrics->>'highRPMPerc' AS NUMERIC) as rpm,
                CAST(metrics->>'idleTimePerc' AS NUMERIC) as idle,
                overall_score as f_score
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            WHERE d.name = $1
              AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= '2026-03-01'
              AND DATE((es.period_end AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= '2026-03-27'
        `, [name]);

        let totalDist = 0;
        let fScoreWeighted = 0;
        let eventSums: Record<string, number> = {};
        let rpmDistWeighted = 0;
        let idleDistWeighted = 0;

        res.rows.forEach(r => {
            const d = parseFloat(r.dist) || 0;
            totalDist += d;
            fScoreWeighted += (parseFloat(r.f_score) * d);
            const ev = r.events || {};
            for (const [k, v] of Object.entries(ev)) { eventSums[k] = (eventSums[k] || 0) + (v as number); }
            rpmDistWeighted += (parseFloat(r.rpm) || 0) * d;
            idleDistWeighted += (parseFloat(r.idle) || 0) * d;
        });

        if (totalDist > 0) {
            anchorData.push({
                name,
                target: fScoreWeighted / totalDist,
                metrics: {
                    mileage: totalDist,
                    eventCounts: eventSums,
                    highRPMPerc: rpmDistWeighted / totalDist,
                    idleTimePerc: idleDistWeighted / totalDist
                }
            });
        }
    }

    const BASE_THRESHOLDS: any = {
        harshAccelerationLow: [0.08, 0.35, 0.80, 1.30, 2.00, 2.85, 3.85, 5.50, 9.00],
        harshAccelerationHigh: [0.03, 0.08, 0.20, 0.28, 0.45, 0.65, 1.15, 1.60, 2.65],
        harshBrakingLow: [0.30, 0.80, 1.35, 1.75, 2.30, 3.00, 3.90, 4.90, 7.50],
        harshBrakingHigh: [0.05, 0.10, 0.19, 0.30, 0.42, 0.56, 0.83, 1.21, 1.90],
        harshCornering: [0.25, 1.20, 3.85, 7.70, 13.70, 19.70, 23.50, 35.20, 45.00],
        highRPM: [0.0, 1.0, 3.0, 6.0, 10.0, 15.0, 25.0, 40.0, 60.0],
        excessiveIdling: [0.0, 4.0, 10.0, 18.0, 28.0, 40.0, 55.0, 75.0, 100.0]
    };

    let bestErr = Infinity;
    let bestConfig: any = null;

    console.log("Running Deep Reverse-Engineering Grid Search...");

    // Grid search over multiplier (thresholds) and base score floor (0.0 to 1.0)
    for (let factor = 0.8; factor <= 1.2; factor += 0.05) {
        for (let floor of [0, 0.5, 1.0]) {
            // Also vary weights slightly around user's defaults
            for (let wAccelL of [0.70, 0.80, 0.90]) {
                for (let wBrakeL of [0.65, 0.70, 0.75]) {
                    const W: any = {
                        harshAccelerationLow: wAccelL,
                        harshAccelerationHigh: 0.75,
                        harshBrakingLow: wBrakeL,
                        harshBrakingHigh: 0.75,
                        harshCornering: 0.70,
                        excessiveIdling: 0.20,
                        highRPM: 0.22
                    };

                    let totalErr = 0;
                    
                    anchorData.forEach(a => {
                        let wSum = 0; let wT = 0;
                        const distRatio = a.metrics.mileage / 100;

                        for (const [key, weight] of Object.entries(W)) {
                            const val = key === 'highRPM' ? a.metrics.highRPMPerc : 
                                       key === 'excessiveIdling' ? a.metrics.idleTimePerc :
                                       key === 'harshBrakingHigh' ? ((a.metrics.eventCounts.highSpeedBreak || 0) + (a.metrics.eventCounts.accelBrakeFastShift || 0)) / distRatio :
                                       key === 'harshAccelerationLow' ? (a.metrics.eventCounts.lowSpeedAcceleration || 0) / distRatio :
                                       key === 'harshAccelerationHigh' ? (a.metrics.eventCounts.highSpeedAcceleration || 0) / distRatio :
                                       key === 'harshBrakingLow' ? (a.metrics.eventCounts.lowSpeedBreak || 0) / distRatio :
                                       (a.metrics.eventCounts.lateralAcceleration || 0) / distRatio;

                            const t = BASE_THRESHOLDS[key].map((v: number) => v * factor);
                            const v = Math.max(0, val);
                            
                            let score = floor; // Default bottom
                            if (v === 0) score = 10.0;
                            else if (v <= t[0]) score = 10.0 - ((v/t[0]) * (10 - 9));
                            else {
                                for (let i = 0; i < t.length - 1; i++) {
                                    if (v <= t[i+1]) {
                                        score = (9 - i) - ((v - t[i]) / (t[i+1] - t[i]));
                                        break;
                                    }
                                }
                            }
                            // Clamp lower bound
                            score = Math.max(floor, score);

                            wSum += score * (weight as number);
                            wT += (weight as number);
                        }
                        const calc = wSum / wT;
                        totalErr += Math.abs(calc - a.target);
                    });

                    if (totalErr < bestErr) {
                        bestErr = totalErr;
                        bestConfig = { factor, floor, weights: W };
                    }
                }
            }
        }
    }

    console.log(`\nBest Total Error: ${bestErr.toFixed(4)} (Avg: ${(bestErr/anchorData.length).toFixed(4)})`);
    console.log(`Config:\n  Factor: ${bestConfig.factor.toFixed(2)}\n  Floor: ${bestConfig.floor}\n  Weights:`, bestConfig.weights);

    // Final verification print
    console.log("\nParity Check with Best Config:");
    anchorData.forEach(a => {
        let wSum = 0; let wT = 0;
        const distRatio = a.metrics.mileage / 100;
        for (const [key, weight] of Object.entries(bestConfig.weights)) {
            const val = key === 'highRPM' ? a.metrics.highRPMPerc : 
                       key === 'excessiveIdling' ? a.metrics.idleTimePerc :
                       key === 'harshBrakingHigh' ? ((a.metrics.eventCounts.highSpeedBreak || 0) + (a.metrics.eventCounts.accelBrakeFastShift || 0)) / distRatio :
                       key === 'harshAccelerationLow' ? (a.metrics.eventCounts.lowSpeedAcceleration || 0) / distRatio :
                       key === 'harshAccelerationHigh' ? (a.metrics.eventCounts.highSpeedAcceleration || 0) / distRatio :
                       key === 'harshBrakingLow' ? (a.metrics.eventCounts.lowSpeedBreak || 0) / distRatio :
                       (a.metrics.eventCounts.lateralAcceleration || 0) / distRatio;
            const t = BASE_THRESHOLDS[key].map((v: number) => v * bestConfig.factor);
            const v = Math.max(0, val);
            let score = bestConfig.floor;
            if (v === 0) score = 10.0;
            else if (v <= t[0]) score = 10.0 - (v / t[0]);
            else {
                for (let i = 0; i < t.length - 1; i++) {
                    if (v <= t[i+1]) { score = (9 - i) - ((v - t[i]) / (t[i+1] - t[i])); break; }
                }
            }
            score = Math.max(bestConfig.floor, score);
            wSum += score * (weight as number); wT += (weight as number);
        }
        console.log(`${a.name.padEnd(40)} | Target: ${a.target.toFixed(2)} | Calc: ${(wSum / wT).toFixed(2)} | Diff: ${((wSum/wT) - a.target).toFixed(2)}`);
    });

    await pool.end();
}

test().catch(console.error);
