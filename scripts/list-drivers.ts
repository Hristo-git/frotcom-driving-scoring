import pool from '../lib/db';

async function listDrivers() {
    const res = await pool.query(`
        SELECT d.name, es.period_start, es.period_end 
        FROM ecodriving_scores es 
        JOIN drivers d ON es.driver_id = d.id 
        WHERE d.name LIKE '%Николай%' 
        LIMIT 20
    `);
    console.table(res.rows);
    await pool.end();
}

listDrivers().catch(console.error);
