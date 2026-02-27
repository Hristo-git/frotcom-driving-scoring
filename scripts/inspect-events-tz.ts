import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkEvents() {
  console.log('--- EVENT DATA INSPECTION ---');
  const res = await pool.query(`
        SELECT frotcom_event_id, started_at, event_type,
               TO_CHAR(started_at AT TIME ZONE 'Europe/Sofia', 'YYYY-MM-DD HH24:MI:SS') as sofia_local_str,
               DATE(started_at AT TIME ZONE 'Europe/Sofia') as sofia_date
        FROM ecodriving_events 
        WHERE driver_id = 58 
          AND started_at BETWEEN '2026-02-24' AND '2026-02-27'
        ORDER BY started_at ASC
        LIMIT 20
    `);
  console.table(res.rows);
  await pool.end();
}
checkEvents();
