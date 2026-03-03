
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkKostadinMarch2() {
    try {
        const res = await pool.query(`
            SELECT period_start, overall_score, metrics
            FROM ecodriving_scores
            WHERE driver_id = 304 AND period_start >= '2026-03-02'
        `);
        console.log(`Kostadin scores for March 2: ${res.rowCount}`);
        if (res.rowCount! > 0) {
            console.log(`Score: ${res.rows[0].overall_score}`);
        }
    } catch (e: any) {
        console.error(e.message);
    } finally {
        await pool.end();
    }
}
checkKostadinMarch2();
