
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function generateRawReport() {
    try {
        const driverId = 283;
        const targetDate = '2026-02-25';

        const res = await pool.query(`
            SELECT 
                started_at AT TIME ZONE 'Europe/Sofia' as time,
                event_type,
                address_start as location,
                duration_sec as duration
            FROM ecodriving_events 
            WHERE driver_id = $1 AND DATE(started_at AT TIME ZONE 'Europe/Sofia') = $2
            ORDER BY started_at
        `, [driverId, targetDate]);

        console.log(`REPORT_START`);
        console.log(`Driver: Hristo Tsvetev Petrov`);
        console.log(`Date: ${targetDate}`);
        console.log(`Total Events: ${res.rows.length}`);
        console.log(`---`);
        res.rows.forEach(r => {
            console.log(`[${r.time.toISOString()}] ${r.event_type} at ${r.location}`);
        });
        console.log(`REPORT_END`);

    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
generateRawReport();
