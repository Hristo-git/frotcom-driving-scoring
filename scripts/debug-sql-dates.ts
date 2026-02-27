import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testQuery() {
    try {
        const start = '2026-02-25T00:00:00.000Z';
        const end = '2026-02-25T23:59:59.999Z';
        console.log(`Testing query for $1=${start} and $2=${end}`);

        let query = `
            SELECT d.name, es.period_start, es.period_end, es.metrics->>'mileage' as mileage
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            WHERE d.name LIKE '%Костадин Ангелов Аклашев%'
              AND DATE(es.period_start AT TIME ZONE 'Europe/Sofia') >= DATE($1::timestamptz AT TIME ZONE 'Europe/Sofia')
              AND DATE(es.period_end   AT TIME ZONE 'Europe/Sofia') <= DATE($2::timestamptz AT TIME ZONE 'Europe/Sofia')
        `;
        const { rows } = await pool.query(query, [start, end]);
        console.log("Records matched:");
        console.table(rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
testQuery();
