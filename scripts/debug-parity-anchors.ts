import pool from '../lib/db';
import { ScoringEngine } from '../lib/scoring';
import { DEFAULT_WEIGHTS } from '../lib/scoring-types';

async function debug() {
    const drivers = ['Николай Красимиров Костадинов - Петрич', 'Живко Георгиев Иванов - Петрич', 'Костадин Ангелов Аклашев - Петрич'];
    
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
        let totalWeights = 0;
        let fScoreWeighted = 0;
        let eventSums: Record<string, number> = {};
        let rpmDistWeighted = 0;
        let idleDistWeighted = 0;

        res.rows.forEach(r => {
            const d = parseFloat(r.dist) || 0;
            totalDist += d;
            fScoreWeighted += (parseFloat(r.f_score) * d);
            
            const ev = r.events || {};
            for (const [k, v] of Object.entries(ev)) {
                eventSums[k] = (eventSums[k] || 0) + (v as number);
            }

            rpmDistWeighted += (parseFloat(r.rpm) || 0) * d;
            idleDistWeighted += (parseFloat(r.idle) || 0) * d;
        });

        const finalFScore = totalDist > 0 ? fScoreWeighted / totalDist : 0;
        const avgRPM = totalDist > 0 ? rpmDistWeighted / totalDist : 0;
        const avgIdle = totalDist > 0 ? idleDistWeighted / totalDist : 0;

        const combinedMetrics = {
            mileage: totalDist,
            eventCounts: eventSums,
            highRPMPerc: avgRPM,
            idleTimePerc: avgIdle
        };

        const engine = new ScoringEngine();
        const calc = engine.calculateCustomScore(combinedMetrics, DEFAULT_WEIGHTS, 83);

        console.log(`\nDriver: ${name}`);
        console.log(`Total Dist: ${totalDist.toFixed(1)}`);
        console.log(`Avg RPM: ${avgRPM.toFixed(2)}% | Avg Idle: ${avgIdle.toFixed(2)}%`);
        console.log(`Frotcom Aggregated: ${finalFScore.toFixed(2)}`);
        console.log(`Our Calculated: ${calc.toFixed(2)}`);
        console.log(`Delta: ${(calc - finalFScore).toFixed(4)}`);
        
        // Detailed check
        const details = engine.calculateDetailedScores(combinedMetrics, DEFAULT_WEIGHTS);
        console.table(details);

        // Check category 6 (Sudden Brake/Throttle Change)
        const distRatio = totalDist / 100;
        const cat6 = (eventSums['suddenBrakeThrottleChange'] || 0) / distRatio;
        console.log(`Category 6 (events/100km): ${cat6.toFixed(2)}`);
    }

    await pool.end();
}

debug().catch(console.error);
