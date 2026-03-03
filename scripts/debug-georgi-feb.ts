
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugGeorgi() {
    const fid = '269157';
    try {
        const res = await pool.query(`
            SELECT 
                period_start::date as date,
                (metrics->>'mileage')::numeric as mileage,
                overall_score,
                (metrics->>'vehicles') as vehicles
            FROM ecodriving_scores s
            JOIN drivers d ON s.driver_id = d.id
            WHERE d.frotcom_id = $1
              AND period_start >= '2026-02-01T00:00:00'
              AND period_end <= '2026-02-28T23:59:59'
            ORDER BY period_start
        `, [fid]);

        console.table(res.rows.map(r => ({
            ...r,
            mileage: parseFloat(r.mileage).toFixed(1)
        })));

        const total = res.rows.reduce((acc, r) => acc + parseFloat(r.mileage), 0);
        console.log(`Total Mileage: ${total.toFixed(1)} km`);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
debugGeorgi();
