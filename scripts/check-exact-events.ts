
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkExactEvents() {
    try {
        const driverId = 342;
        const res = await pool.query(
            `SELECT 
                started_at, 
                started_at AT TIME ZONE 'Europe/Sofia' as sofia_time,
                event_type
             FROM ecodriving_events 
             WHERE driver_id = $1 
               AND started_at >= '2026-02-28T00:00:00Z'
               AND started_at <= '2026-03-03T00:00:00Z'
             ORDER BY started_at ASC`,
            [driverId]
        );
        res.rows.forEach(r => {
            console.log(`UTC: ${r.started_at.toISOString()} | Sofia: ${r.sofia_time} | Type: ${r.event_type}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkExactEvents();
