
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function findMissingDrivers() {
    try {
        const targetDate = '2026-02-25';
        // Get drivers who exist but have no score on that day
        const res = await pool.query(`
            SELECT d.id, d.name 
            FROM drivers d
            LEFT JOIN ecodriving_scores s ON d.id = s.driver_id AND CAST(s.period_start AS DATE) = $1
            WHERE s.id IS NULL
            ORDER BY d.name
        `, [targetDate]);
        console.log(`Drivers missing scoring records for ${targetDate}: ${res.rows.length}`);
        // Log first 20
        console.table(res.rows.slice(0, 20));
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
findMissingDrivers();
