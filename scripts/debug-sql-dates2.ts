import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testQuery() {
    try {
        let query = `
            SELECT es.period_start, es.period_end, 
                   DATE(es.period_start AT TIME ZONE 'Europe/Sofia') as d_start,
                   DATE(es.period_end AT TIME ZONE 'Europe/Sofia') as d_end
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            WHERE d.name LIKE '%Костадин Ангелов Аклашев%'
              AND es.period_start >= '2026-02-23'
            ORDER BY es.period_start ASC
        `;
        const { rows } = await pool.query(query);
        console.table(rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
testQuery();
