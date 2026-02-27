
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function showRawEventDetails() {
    try {
        const driverId = 283;
        const targetDate = '2026-02-25';
        console.log(`--- Raw Event Details for Driver ${driverId} on ${targetDate} ---`);

        const res = await pool.query(`
            SELECT 
                started_at AT TIME ZONE 'Europe/Sofia' as started_sofi,
                event_type,
                duration_sec,
                description,
                address_start,
                address_end
            FROM ecodriving_events 
            WHERE driver_id = $1 AND CAST(started_at AS DATE) = $2
            ORDER BY started_at
            LIMIT 10
        `, [driverId, targetDate]);

        console.table(res.rows);

        console.log('\n--- Checking final metrics in ecodriving_scores ---');
        const scoreRes = await pool.query(`
            SELECT metrics->'eventCounts' as counts, metrics->'eventDurations' as durations
            FROM ecodriving_scores
            WHERE driver_id = $1 AND CAST(period_start AS DATE) = $2
        `, [driverId, targetDate]);
        console.log(JSON.stringify(scoreRes.rows[0], null, 2));

    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
showRawEventDetails();
