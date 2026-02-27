
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function compareCounts() {
    try {
        const res24 = await pool.query("SELECT count(*) FROM ecodriving_scores WHERE CAST(period_start AS DATE) = '2026-02-24'");
        const res25 = await pool.query("SELECT count(*) FROM ecodriving_scores WHERE CAST(period_start AS DATE) = '2026-02-25'");
        console.log(`Feb 24 scores: ${res24.rows[0].count}`);
        console.log(`Feb 25 scores: ${res25.rows[0].count}`);
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
compareCounts();
