import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkEvent() {
    const res = await pool.query(`
        SELECT frotcom_event_id, started_at, 
               DATE(started_at AT TIME ZONE 'Europe/Sofia') as d, 
               TO_CHAR(started_at AT TIME ZONE 'Europe/Sofia', 'YYYY-MM-DD HH24:MI:SS') as s 
        FROM ecodriving_events 
        WHERE frotcom_event_id = 3313877718
    `);
    console.table(res.rows);
    await pool.end();
}
checkEvent();
