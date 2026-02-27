
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function countScores() {
    try {
        const res = await pool.query("SELECT count(*) FROM ecodriving_scores WHERE CAST(period_start AS DATE) = '2026-02-25'");
        console.log(`Total scores for Feb 25: ${res.rows[0].count}`);
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
countScores();
