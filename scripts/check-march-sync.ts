
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkMarchData() {
    try {
        console.log('Checking ecodriving_scores for March 1st...');
        const res = await pool.query(`
            SELECT 
                driver_id, 
                overall_score, 
                metrics->>'mileage' as dist 
            FROM ecodriving_scores 
            WHERE period_start::date = '2026-03-01' 
            LIMIT 10
        `);
        console.table(res.rows);

        console.log('\nChecking if scores for different drivers share the exact same mileage (suspicious)...');
        const counts = await pool.query(`
            SELECT metrics->>'mileage' as dist, count(*) 
            FROM ecodriving_scores 
            WHERE period_start::date = '2026-03-01' 
            GROUP BY 1 
            HAVING count(*) > 1
        `);
        console.table(counts.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkMarchData();
