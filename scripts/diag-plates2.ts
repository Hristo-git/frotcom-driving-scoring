import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    // Get unmatched plates and check if stripping suffix helps
    const r1 = await pool.query(`
        WITH eco_plates AS (
            SELECT DISTINCT jsonb_array_elements_text(es.metrics->'vehicles') AS plate
            FROM ecodriving_scores es
            WHERE DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= '2026-03-01'
              AND (es.metrics->>'isPeriodSummary') IS NULL
              AND jsonb_typeof(es.metrics->'vehicles') = 'array'
        )
        SELECT ep.plate, v.license_plate as exact
        FROM eco_plates ep
        LEFT JOIN vehicles v ON v.license_plate = ep.plate
        WHERE v.license_plate IS NULL
        ORDER BY ep.plate
        LIMIT 30
    `);

    console.log('Unmatched plates:');
    const unmatchedPlates = r1.rows.map((r: any) => r.plate);
    unmatchedPlates.forEach((p: string) => console.log(' ', p));

    // Check all vehicles plates for comparison
    const r2 = await pool.query(`SELECT license_plate FROM vehicles ORDER BY license_plate LIMIT 30`);
    console.log('\nVehicles table plates (first 30):');
    r2.rows.forEach((r: any) => console.log(' ', r.license_plate));

    await pool.end();
}
run().catch(console.error);
