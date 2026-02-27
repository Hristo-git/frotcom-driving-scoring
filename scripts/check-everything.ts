import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkIds() {
    const res = await pool.query(`
        SELECT id, driver_id, 
               TO_CHAR(period_start, 'YYYY-MM-DD HH24:MI:SS') as ps_str,
               DATE(period_start AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Sofia') as sofia_date_calc
        FROM ecodriving_scores 
        WHERE id IN (39390, 39535)
    `);
    console.table(res.rows);

    const driverId = res.rows[0].driver_id;
    console.log(`Checking events for driver_id = ${driverId}`);

    const eventRes = await pool.query(`
        SELECT DATE(started_at AT TIME ZONE 'Europe/Sofia') as d, count(*) 
        FROM ecodriving_events 
        WHERE driver_id = $1
        GROUP BY d
        ORDER BY d
    `, [driverId]);
    console.table(eventRes.rows);

    await pool.end();
}
checkIds();
