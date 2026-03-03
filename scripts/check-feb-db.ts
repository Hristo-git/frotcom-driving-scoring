
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkFebruaryTotals() {
    const frotcomIds = ['283043', '269157'];

    try {
        console.log("--- Checking February Data in Database ---");
        for (const fid of frotcomIds) {
            const res = await pool.query(`
                SELECT 
                    d.name,
                    COUNT(*) as days_active,
                    SUM((metrics->>'mileage')::numeric) as total_mileage,
                    SUM(overall_score * (metrics->>'mileage')::numeric) / NULLIF(SUM((metrics->>'mileage')::numeric), 0) as weighted_score
                FROM ecodriving_scores s
                JOIN drivers d ON s.driver_id = d.id
                WHERE d.frotcom_id = $1
                  AND period_start >= '2026-02-01T00:00:00'
                  AND period_end <= '2026-02-28T23:59:59'
                GROUP BY d.name
            `, [fid]);

            if (res.rows.length > 0) {
                console.log(JSON.stringify(res.rows[0], null, 2));
            } else {
                console.log(`No data for Frotcom ID ${fid} in February.`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
checkFebruaryTotals();
