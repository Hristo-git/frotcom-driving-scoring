import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkRecord() {
    const res = await pool.query(`
        SELECT id, 
               TO_CHAR(period_start, 'YYYY-MM-DD HH24:MI:SS') as raw_period_start,
               period_start as js_period_start
        FROM ecodriving_scores 
        WHERE id = 39390
    `);
    console.table(res.rows);
    await pool.end();
}
checkRecord();
