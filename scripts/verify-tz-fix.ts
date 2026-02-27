import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verifyQuery() {
    const res = await pool.query(`
        SELECT id, period_start,
               (period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia' as correct_sofia_ts,
               DATE((period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') as correct_sofia_date
        FROM ecodriving_scores 
        WHERE id IN (39390, 39535)
    `);
    console.table(res.rows);
    await pool.end();
}
verifyQuery();
