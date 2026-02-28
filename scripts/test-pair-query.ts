import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testQuery() {
    try {
        const start = '2026-02-27T00:00:00';
        const end = '2026-02-27T23:59:59';

        console.log(`Testing query with start=${start}, end=${end}`);

        const query = `
            SELECT DISTINCT
                v.id          AS internal_vehicle_id,
                v.frotcom_id  AS frotcom_vehicle_id,
                v.license_plate,
                d.id          AS internal_driver_id,
                d.frotcom_id  AS frotcom_driver_id
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            JOIN vehicles v ON v.license_plate = ANY(
                ARRAY(
                    SELECT jsonb_array_elements_text(CASE 
                        WHEN jsonb_typeof(es.metrics->'vehicles') = 'array' THEN es.metrics->'vehicles'
                        ELSE '[]'::jsonb 
                    END)
                )
            )
            WHERE es.period_start >= ($1::timestamp AT TIME ZONE 'Europe/Sofia') 
              AND es.period_start < ($2::timestamp AT TIME ZONE 'Europe/Sofia')
              AND v.frotcom_id IS NOT NULL
              AND d.frotcom_id IS NOT NULL
              AND d.id = 371
        `;

        const { rows } = await pool.query(query, [start, end]);
        console.log('Results:');
        console.table(rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
testQuery();
