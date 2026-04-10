import pool from '../lib/db';

async function findNikolai() {
    const res = await pool.query(`
        SELECT d.name, es.period_start, es.period_end, es.metrics->>'mileage' as dist
        FROM ecodriving_scores es 
        JOIN drivers d ON es.driver_id = d.id 
        WHERE d.name LIKE '%Николай Красимиров%'
    `);
    console.table(res.rows);
    await pool.end();
}

findNikolai().catch(console.error);
