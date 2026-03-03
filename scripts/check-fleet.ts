
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkFleet() {
    try {
        console.log('Top drivers by mileage in February after re-sync:');
        const res = await pool.query(`
            SELECT d.name, sum((metrics->>'mileage')::float) as total_dist, count(*) as days
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            WHERE period_start >= '2026-02-01' AND period_start < '2026-03-01'
            GROUP BY 1
            ORDER BY 2 DESC
            LIMIT 20
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkFleet();
