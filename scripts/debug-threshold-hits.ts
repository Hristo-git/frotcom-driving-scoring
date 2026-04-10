import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';

async function test() {
    const drivers = ['Николай Красимиров Костадинов - Петрич', 'Живко Георгиев Иванов - Петрич', 'Костадин Ангелов Аклашев - Петрич'];
    const engine = new ScoringEngine();

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
        let eventSums: Record<string, number> = {};
        res.rows.forEach(r => {
            totalDist += parseFloat(r.dist) || 0;
            const ev = r.events || {};
            for (const [k, v] of Object.entries(ev)) { eventSums[k] = (eventSums[k] || 0) + (v as number); }
        });

        const distRatio = totalDist / 100;
        console.log(`\nDriver: ${name} (Dist: ${totalDist.toFixed(1)}km)`);
        
        const metrics = [
            { key: 'harshAccelerationLow', count: eventSums['lowSpeedAcceleration'] || 0 },
            { key: 'harshAccelerationHigh', count: eventSums['highSpeedAcceleration'] || 0 },
            { key: 'harshBrakingLow', count: eventSums['lowSpeedBreak'] || 0 },
            { key: 'harshBrakingHigh', count: (eventSums['highSpeedBreak'] || 0) + (eventSums['accelBrakeFastShift'] || 0) },
            { key: 'harshCornering', count: eventSums['lateralAcceleration'] || 0 }
        ];

        metrics.forEach(m => {
            const rate = m.count / distRatio;
            // @ts-ignore
            const score = engine.calculateCategoryScore(rate, m.key);
            console.log(`${m.key.padEnd(25)}: ${rate.toFixed(3)} ev/100km | Score: ${score.toFixed(2)}`);
        });
    }
    await pool.end();
}

test().catch(console.error);
