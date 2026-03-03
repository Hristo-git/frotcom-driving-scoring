
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function findRealDays() {
    try {
        console.log('Finding days with events for Kostadin (ID 615)...');
        const res = await pool.query(`
            SELECT 
                started_at::date as date, 
                count(*) as event_count
            FROM ecodriving_events 
            WHERE frotcom_driver_id = 615 
            GROUP BY 1 
            ORDER BY 1 DESC
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findRealDays();
