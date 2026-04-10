import { ScoringEngine } from '../lib/scoring';
import { DEFAULT_WEIGHTS } from '../lib/scoring-types';
import pool from '../lib/db';

async function test() {
    const engine = new ScoringEngine();
    const name = 'Николай Красимиров Костадинов - Петрич';
    
    // Corrected SQL logic (matching Frotcom's Start Date selection)
    const res = await pool.query(`
        SELECT 
            metrics->>'mileage' as dist,
            metrics->'eventCounts' as events,
            CAST(metrics->>'highRPMPerc' AS NUMERIC) as rpm,
            CAST(metrics->>'idleTimePerc' AS NUMERIC) as idle,
            metrics->>'hasLowMileage' as low_mileage,
            overall_score as f_score
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE d.name = $1
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= '2026-03-01'
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= '2026-03-27'
    `, [name]);

    let totalDist = 0;
    let totalWeightedScore = 0;

    res.rows.forEach(r => {
        const d = parseFloat(r.dist) || 0;
        const metrics = {
            mileage: d,
            eventCounts: r.events || {},
            highRPMPerc: parseFloat(r.rpm) || 0,
            idleTimePerc: parseFloat(r.idle) || 0,
            hasLowMileage: r.low_mileage === 'true' || r.low_mileage === true
        };
        
        const dayScore = engine.calculateCustomScore(metrics, DEFAULT_WEIGHTS);
        totalDist += d;
        totalWeightedScore += (dayScore * d);
    });

    const finalAvg = totalWeightedScore / totalDist;
    console.log(`Driver: ${name}`);
    console.log(`Total Distance: ${totalDist.toFixed(1)} km (Target: 4703.4)`);
    console.log(`Calculated Score: ${finalAvg.toFixed(2)} (Target: 4.3)`);

    await pool.end();
}
test().catch(console.error);
