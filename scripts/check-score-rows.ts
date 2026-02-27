
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function checkScoreRows() {
    try {
        const driverId = 283;
        console.log(`--- Scoring Rows for Driver ${driverId} ---`);
        const res = await pool.query(`
            SELECT 
                id,
                period_start, 
                period_start AT TIME ZONE 'Europe/Sofia' as sofia_start,
                overall_score,
                metrics->'eventCounts' as counts
            FROM ecodriving_scores 
            WHERE driver_id = $1
            ORDER BY period_start DESC
            LIMIT 5
        `, [driverId]);
        console.table(res.rows);
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
checkScoreRows();
