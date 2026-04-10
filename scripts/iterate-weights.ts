import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';

async function test() {
    const drivers = ['Николай Красимиров Костадинов - Петрич', 'Живко Георгиев Иванов - Петрич', 'Костадин Ангелов Аклашев - Петрич'];
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

        anchorData.push({
            name,
            target: totalDist > 0 ? fScoreWeighted / totalDist : 0,
            metrics: {
                mileage: totalDist,
                eventCounts: eventSums,
                highRPMPerc: totalDist > 0 ? rpmDistWeighted / totalDist : 0,
                idleTimePerc: totalDist > 0 ? idleDistWeighted / totalDist : 0
            }
        });
    }

    const engine = new ScoringEngine();
    let bestError = Infinity;
    let bestWeights = {};

    // Standard weights from user
    const W = {
        hAL: 0.90, hAH: 0.75, hBL: 0.65, hBH: 0.75, hC: 0.70, idle: 0.20, rpm: 0.22
    };

    console.log("Searching for optimal weight combination...");

    for (let w1 = 0.6; w1 <= 1.0; w1 += 0.05) { // Accel Low
        for (let w2 = 0.6; w2 <= 0.8; w2 += 0.05) { // Accel High
            const testWeights: any = {
                harshAccelerationLow: w1,
                harshAccelerationHigh: w2,
                harshBrakingLow: 0.65,
                harshBrakingHigh: 0.75,
                harshCornering: 0.70,
                accelBrakeSwitch: 0.0,
                excessiveIdling: 0.20,
                highRPM: 0.22,
                alarms: 0, noCruiseControl: 0, accelDuringCruise: 0
            };

            let totalErr = 0;
            anchorData.forEach(a => {
                const calc = engine.calculateCustomScore(a.metrics, testWeights, 83);
                totalErr += Math.abs(calc - a.target);
            });

            if (totalErr < bestError) {
                bestError = totalErr;
                bestWeights = { ...testWeights };
            }
        }
    }

    console.log(`Best Avg Error: ${(bestError / anchorData.length).toFixed(4)}`);
    console.log("Best WeightsFound:", JSON.stringify(bestWeights, null, 2));
    
    await pool.end();
}

test().catch(console.error);
