import pool from '../lib/db';

async function test() {
    const res = await pool.query(`
        SELECT d.name, es.overall_score as f_score, es.metrics->>'mileage' as dist, 
               es.metrics->'eventCounts' as events, es.metrics->>'highRPMPerc' as rpm, es.metrics->>'idleTimePerc' as idle 
        FROM ecodriving_scores es 
        JOIN drivers d ON es.driver_id = d.id 
        WHERE (d.name LIKE '%Yordan%' OR d.name LIKE '%Марјан Трајковски%')
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= '2026-03-01'
        LIMIT 5;
    `);
    
    console.log(JSON.stringify(res.rows, null, 2));
    await pool.end();
}

test().catch(console.error);
