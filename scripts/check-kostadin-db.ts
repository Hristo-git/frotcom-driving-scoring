
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkKostadin() {
    try {
        const res = await pool.query(
            `SELECT period_start, overall_score 
             FROM ecodriving_scores 
             WHERE driver_id = 304 
             AND period_start >= '2026-02-01' 
             AND period_start < '2026-03-01'
             ORDER BY period_start ASC`
        );
        console.log(`Kostadin has ${res.rowCount} records in Feb:`);
        res.rows.forEach(r => {
            console.log(`  ${r.period_start.toISOString().split('T')[0]}: ${r.overall_score}`);
        });

        const avgRes = await pool.query(
            `SELECT AVG(overall_score) as avg_score 
             FROM ecodriving_scores 
             WHERE driver_id = 304 
             AND period_start >= '2026-01-29' 
             AND period_start <= '2026-02-28'
             AND overall_score > 0` // rudimentary 30-day avg check
        );
        console.log(`\nApproximate 30-day Average: ${avgRes.rows[0].avg_score}`);
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
checkKostadin();
