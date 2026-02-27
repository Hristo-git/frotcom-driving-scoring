
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function cleanAndVerify() {
    // Hard delete all daily ecodriving scores for the full range
    const r = await pool.query(`
        DELETE FROM ecodriving_scores 
        WHERE period_start >= '2026-01-01' AND period_start <= '2026-02-19T23:59:59'
    `);
    console.log(`Deleted ${r.rowCount} rows from ecodriving_scores.`);

    // Confirm empty
    const check = await pool.query(`
        SELECT COUNT(*) as remaining
        FROM ecodriving_scores
        WHERE period_start >= '2026-01-01'
    `);
    console.log(`Remaining rows after delete: ${check.rows[0].remaining}`);

    await pool.end();
}

cleanAndVerify().catch(console.error);
