
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function analyzeKostadinEvents() {
    const frotcomId = 297309; // Kostadin

    try {
        console.log(`Analyzing events for Kostadin (frotcom_id: ${frotcomId})...`);

        const res = await pool.query(`
            SELECT event_type, count(*), sum(duration_sec) as total_sec
            FROM ecodriving_events
            WHERE frotcom_driver_id = $1
            GROUP BY 1
            ORDER BY 2 DESC
        `, [frotcomId]);

        console.log('Event types and counts:');
        console.table(res.rows);

        // Check recent days
        const dailyRes = await pool.query(`
            SELECT started_at::date, count(*)
            FROM ecodriving_events
            WHERE frotcom_driver_id = $1
            GROUP BY 1
            ORDER BY 1 DESC
            LIMIT 10
        `, [frotcomId]);

        console.log('\nDaily event counts:');
        console.table(dailyRes.rows);

    } catch (err: any) {
        console.error('DB Error:', err.message);
    } finally {
        await pool.end();
    }
}

analyzeKostadinEvents();
