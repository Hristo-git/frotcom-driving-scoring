
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function debugHristo() {
    try {
        console.log('--- Driver Search ---');
        const driverRes = await pool.query("SELECT id, name, frotcom_id FROM drivers WHERE name ILIKE '%Hristo%Petrov%'");
        console.table(driverRes.rows);

        const targetDate = '2026-02-25';

        for (const driver of driverRes.rows) {
            console.log(`\n=========================================`);
            console.log(`DRIVER: ${driver.name} (ID: ${driver.id}, FrotcomID: ${driver.frotcom_id})`);
            console.log(`=========================================`);

            console.log(`\n--- Records in ecodriving_scores for ${targetDate} ---`);
            const scoreRes = await pool.query(`
                SELECT period_start, overall_score, metrics
                FROM ecodriving_scores 
                WHERE driver_id = $1 AND CAST(period_start AS DATE) = $2
            `, [driver.id, targetDate]);
            if (scoreRes.rows.length > 0) {
                scoreRes.rows.forEach(row => {
                    console.log(`Date: ${row.period_start}, Score: ${row.overall_score}`);
                    console.log(`Metrics:`, JSON.stringify(row.metrics, null, 2));
                });
            } else {
                console.log('No scoring record found for this date.');
            }

            console.log(`\n--- Raw Events in ecodriving_events for ${targetDate} ---`);
            try {
                const eventRes = await pool.query(`
                    SELECT count(*), event_type 
                    FROM ecodriving_events 
                    WHERE driver_id = $1 AND CAST(started_at AS DATE) = $2
                    GROUP BY event_type
                `, [driver.id, targetDate]);
                if (eventRes.rows.length > 0) {
                    console.table(eventRes.rows);
                } else {
                    console.log('No raw events found for this date.');
                }
            } catch (err: any) {
                console.log(`Error fetching events for ${driver.name}:`, err.message);
            }
        }
    } catch (err: any) {
        console.error('Debug error:', err.message);
    } finally {
        await pool.end();
    }
}
debugHristo();
