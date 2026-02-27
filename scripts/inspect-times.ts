import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function inspectTimes() {
    const res = await pool.query(`
        SELECT id, period_start, 
               period_start AT TIME ZONE 'UTC' as utc_time,
               period_start AT TIME ZONE 'Europe/Sofia' as sofia_time,
               DATE(period_start AT TIME ZONE 'Europe/Sofia') as sofia_date,
               metrics->'eventCounts' as events
        FROM ecodriving_scores 
        WHERE id IN (39390, 39535)
    `);
    console.table(res.rows);
    await pool.end();
}
inspectTimes().catch(console.error);
