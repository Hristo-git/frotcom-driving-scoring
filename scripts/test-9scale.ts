import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';

async function test() {
    const drivers = ['Николай Красимиров Костадинов - Петрич', 'Живко Георгиев Иванов - Петрич', 'Костадин Ангелов Аклашев - Петрич'];
    const anchorData: any[] = [];
    
    for (const name of drivers) {
        const res = await pool.query(/* Same query */ `
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

    const W: any = {
        harshAccelerationLow: 0.90,
        harshAccelerationHigh: 0.75,
        harshBrakingLow: 0.65,
        harshBrakingHigh: 0.75,
        harshCornering: 0.70,
        excessiveIdling: 0.20,
        highRPM: 0.22
    };

    // My new Scoring Logic: 
    // 0.0 -> 10.0
    // thresholds[0] -> 9.0
    // thresholds[1] -> 8.0
    // ...
    // thresholds[8] -> 1.0

    const THRESHOLDS: any = {
        harshAccelerationLow: [0.08, 0.35, 0.80, 1.30, 2.00, 2.85, 3.85, 5.50, 9.00],
        harshAccelerationHigh: [0.03, 0.08, 0.20, 0.28, 0.45, 0.65, 1.15, 1.60, 2.65],
        harshBrakingLow: [0.30, 0.80, 1.35, 1.75, 2.30, 3.00, 3.90, 4.90, 7.50],
        harshBrakingHigh: [0.05, 0.10, 0.19, 0.30, 0.42, 0.56, 0.83, 1.21, 1.90],
        harshCornering: [0.25, 1.20, 3.85, 7.70, 13.70, 19.70, 23.50, 35.20, 45.00],
        highRPM: [0.0, 1.0, 3.0, 6.0, 10.0, 15.0, 25.0, 40.0, 60.0],
        excessiveIdling: [0.0, 4.0, 10.0, 18.0, 28.0, 40.0, 55.0, 75.0, 100.0]
    };

    function calculateCategoryScore(val: number, key: string): number {
        const t = THRESHOLDS[key];
        const v = Math.max(0, val);
        if (v === 0) return 10.0;
        if (v <= t[0]) {
            // Interp between 0.0 (10) and t[0] (9)
            return 10.0 - (v / t[0]);
        }
        for (let i = 0; i < t.length - 1; i++) {
            if (v <= t[i+1]) {
                // Interp between t[i] (9-i) and t[i+1] (8-i)
                const range = t[i+1] - t[i];
                const delta = v - t[i];
                return (9 - i) - (delta / range);
            }
        }
        return 1.0;
    }

    anchorData.forEach(a => {
        let wSum = 0;
        let wTotal = 0;
        
        const distRatio = a.metrics.mileage / 100;
        const catScores = {
            accelLow: calculateCategoryScore((a.metrics.eventCounts.lowSpeedAcceleration || 0) / distRatio, 'harshAccelerationLow'),
            accelHigh: calculateCategoryScore((a.metrics.eventCounts.highSpeedAcceleration || 0) / distRatio, 'harshAccelerationHigh'),
            brakeLow: calculateCategoryScore((a.metrics.eventCounts.lowSpeedBreak || 0) / distRatio, 'harshBrakingLow'),
            brakeHigh: calculateCategoryScore(((a.metrics.eventCounts.highSpeedBreak || 0) + (a.metrics.eventCounts.accelBrakeFastShift || 0)) / distRatio, 'harshBrakingHigh'),
            corner: calculateCategoryScore((a.metrics.eventCounts.lateralAcceleration || 0) / distRatio, 'harshCornering'),
            idle: calculateCategoryScore(a.metrics.idleTimePerc, 'excessiveIdling'),
            rpm: calculateCategoryScore(a.metrics.highRPMPerc, 'highRPM')
        };

        const scoreMap = [
            { s: catScores.accelLow, w: W.harshAccelerationLow },
            { s: catScores.accelHigh, w: W.harshAccelerationHigh },
            { s: catScores.brakeLow, w: W.harshBrakingLow },
            { s: catScores.brakeHigh, w: W.harshBrakingHigh },
            { s: catScores.corner, w: W.harshCornering },
            { s: catScores.idle, w: W.excessiveIdling },
            { s: catScores.rpm, w: W.highRPM }
        ];

        scoreMap.forEach(m => { wSum += m.s * m.w; wTotal += m.w; });
        const calc = wSum / wTotal;

        console.log(`${a.name.padEnd(25)} | Target: ${a.target.toFixed(2)} | Calc: ${calc.toFixed(2)} | Err: ${(calc - a.target).toFixed(4)}`);
    });

    await pool.end();
}

test().catch(console.error);
