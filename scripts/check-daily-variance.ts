
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkVariance() {
    try {
        const res = await pool.query(`
            SELECT 
                period_start::date as day,
                to_char(period_start, 'Day') as day_name,
                COUNT(distinct driver_id) as drivers,
                SUM((metrics->>'mileage')::numeric) as total_km
            FROM ecodriving_scores
            WHERE period_start >= '2026-01-01' AND period_start < '2026-02-01'
            GROUP BY day, day_name
            ORDER BY day ASC;
        `);

        console.table(res.rows.map(r => ({
            day: r.day.toISOString().split('T')[0],
            day_name: r.day_name.trim(),
            drivers: r.drivers,
            total_km: parseFloat(r.total_km).toFixed(2)
        })));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkVariance();
