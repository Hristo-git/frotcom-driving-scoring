
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyDriver() {
    try {
        const res = await pool.query(`
            SELECT DISTINCT es.driver_id, d.name 
            FROM ecodriving_scores es 
            JOIN drivers d ON es.driver_id = d.id 
            WHERE d.name ILIKE '%Chotrev%'
        `);
        console.log('Driver IDs for Chotrev:', res.rows);

        if (res.rows.length > 0) {
            const id = res.rows[0].driver_id;
            console.log(`\nChecking all February records for ID ${id}...`);
            const records = await pool.query(`
                SELECT period_start, (metrics->>'mileage')::float as mileage 
                FROM ecodriving_scores 
                WHERE driver_id = $1 AND period_start >= '2026-02-01' AND period_start < '2026-03-01'
                ORDER BY period_start
            `, [id]);
            console.table(records.rows);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

verifyDriver();
