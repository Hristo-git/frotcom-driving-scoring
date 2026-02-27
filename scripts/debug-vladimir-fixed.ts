
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function debugVladimir() {
    try {
        const driverId = 312;
        const targetDate = '2026-02-25';
        console.log(`DRIVER: Владимир Илиев Костадинов (ID: ${driverId})`);

        const scoreRes = await pool.query(`
            SELECT period_start, overall_score, metrics
            FROM ecodriving_scores 
            WHERE driver_id = $1 AND CAST(period_start AS DATE) = $2
        `, [driverId, targetDate]);
        if (scoreRes.rows.length > 0) {
            scoreRes.rows.forEach(row => {
                console.log(`Score: ${row.overall_score}, Metrics:`, JSON.stringify(row.metrics, null, 2));
            });
        } else {
            console.log('No scoring record.');
        }

        const eventRes = await pool.query(`
            SELECT count(*), event_type 
            FROM ecodriving_events 
            WHERE driver_id = $1 AND CAST(started_at AS DATE) = $2
            GROUP BY event_type
        `, [driverId, targetDate]);
        console.table(eventRes.rows);
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
debugVladimir();
