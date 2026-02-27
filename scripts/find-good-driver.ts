
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function findGoodDriver() {
    try {
        const res = await pool.query(`
            SELECT
                d.name,
                d.frotcom_id,
                es.period_start,
                es.period_end,
                es.metrics->>'mileage' as mileage,
                es.metrics
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            WHERE d.frotcom_id = '298988'
            AND es.period_start = '2026-02-07T00:00:00'
            LIMIT 5;
        `);
        console.log(JSON.stringify(res.rows[0], null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

findGoodDriver();
