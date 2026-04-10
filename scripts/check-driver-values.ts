import pool from '../lib/db';

async function checkValues() {
    const res = await pool.query(`
        SELECT 
            d.name,
            es.overall_score as f_score,
            es.metrics->>'highRPMPerc' as rpm,
            es.metrics->>'idleTimePerc' as idle,
            es.metrics->>'mileage' as dist
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE es.period_start = '2026-03-01' AND es.period_end = '2026-03-27'
          AND (d.name LIKE '%Николай Красимиров%' OR d.name LIKE '%Костадин Ангелов%' OR d.name LIKE '%Живко Георгиев%')
    `);
    console.table(res.rows);
    await pool.end();
}

checkValues().catch(console.error);
