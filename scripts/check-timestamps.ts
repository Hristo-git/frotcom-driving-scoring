
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function checkTimestamps() {
    try {
        const res = await pool.query(`
            SELECT driver_id, period_start, calculated_at, metrics->'eventCounts' as has_events
            FROM ecodriving_scores 
            WHERE driver_id IN (283, 312) AND CAST(period_start AS DATE) = '2026-02-25'
        `);
        console.table(res.rows);
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
checkTimestamps();
