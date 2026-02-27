import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkZhivkoLatest() {
    try {
        console.log('Checking latest scores for Живко Георгиев Иванов (ID: 308019)...');

        const query = `
            SELECT 
                period_start, 
                (metrics->>'mileage')::numeric as mileage,
                (metrics->>'score')::numeric as score,
                (metrics->>'idleTimePerc')::numeric as idle
            FROM ecodriving_scores
            WHERE driver_id = (SELECT id FROM drivers WHERE frotcom_id = '308019' LIMIT 1)
            AND period_start >= '2026-02-15'
            ORDER BY period_start DESC;
        `;

        const res = await pool.query(query);
        console.table(res.rows);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkZhivkoLatest();
