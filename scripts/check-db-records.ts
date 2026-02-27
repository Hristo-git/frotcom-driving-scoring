import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkDailyRecords() {
    try {
        console.log('Checking ecodriving records by date in the database...');

        const query = `
            SELECT 
                period_start, 
                count(*) as record_count,
                sum((metrics->>'mileage')::numeric) as total_mileage
            FROM ecodriving_scores
            WHERE period_start >= '2026-02-20'
            GROUP BY period_start
            ORDER BY period_start DESC;
        `;

        const res = await pool.query(query);

        if (res.rows.length === 0) {
            console.log('No records found for February 2026.');
        } else {
            console.table(res.rows);
        }

    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await pool.end();
    }
}

checkDailyRecords();
