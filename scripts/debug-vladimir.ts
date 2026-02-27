
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function debugVladimir() {
    try {
        console.log('--- Driver Search ---');
        const driverRes = await pool.query("SELECT id, name, frotcom_id FROM drivers WHERE name ILIKE '%Vladimir%Iliev%'");
        console.table(driverRes.rows);

        const targetDate = '2026-02-25';
        for (const driver of driverRes.rows) {
            console.log(`\nDRIVER: ${driver.name} (ID: ${driver.id})`);
            const scoreRes = await pool.query(`
                SELECT period_start, overall_score, metrics
                FROM ecodriving_scores 
                WHERE driver_id = $1 AND CAST(period_start AS DATE) = $2
            `, [driver.id, targetDate]);
            if (scoreRes.rows.length > 0) {
                scoreRes.rows.forEach(row => {
                    console.log(`Score: ${row.overall_score}, Metrics:`, JSON.stringify(row.metrics, null, 2));
                });
            } else {
                console.log('No scoring record.');
            }
        }
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
debugVladimir();
