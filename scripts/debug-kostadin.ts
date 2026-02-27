import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkKostadin() {
    try {
        const query = `
            SELECT d.name, es.period_start, es.period_end, es.metrics, es.overall_score
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            WHERE d.name LIKE '%Костадин Ангелов Аклашев%'
            AND es.period_start >= '2026-02-23'
            ORDER BY es.period_start ASC
        `;
        const { rows } = await pool.query(query);
        console.log("Records for Kostadin from Feb 23 onward:");
        for (const r of rows) {
            console.log(`\n--- Period: ${r.period_start.toISOString()} to ${r.period_end.toISOString()} ---`);
            console.log(`Metrics:`, JSON.stringify(r.metrics, null, 2));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkKostadin();
