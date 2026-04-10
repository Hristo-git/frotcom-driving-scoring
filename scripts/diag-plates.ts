import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    // Sample plates from daily rows
    const r1 = await pool.query(`
        SELECT DISTINCT jsonb_array_elements_text(es.metrics->'vehicles') AS plate
        FROM ecodriving_scores es
        WHERE DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= '2026-03-01'
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= '2026-03-31'
          AND (es.metrics->>'isPeriodSummary') IS NULL
          AND jsonb_typeof(es.metrics->'vehicles') = 'array'
          AND jsonb_array_length(es.metrics->'vehicles') > 0
        LIMIT 30
    `);
    const plates = r1.rows.map((r: any) => r.plate);
    console.log('Sample plates from ecodriving rows:', plates.slice(0, 20));

    // Sample plates from vehicles table
    const r2 = await pool.query(`SELECT license_plate, metadata->>'manufacturer' as mfr FROM vehicles LIMIT 20`);
    console.log('\nSample plates in vehicles table:');
    r2.rows.forEach((r: any) => console.log(`  ${r.license_plate} → ${r.mfr}`));

    // Check how many ecodriving plates match vehicles table exactly
    const r3 = await pool.query(`
        SELECT
            COUNT(DISTINCT sub.plate) as total_plates,
            COUNT(DISTINCT sub.plate) FILTER (WHERE v.license_plate IS NOT NULL) as matched,
            COUNT(DISTINCT sub.plate) FILTER (WHERE v.license_plate IS NULL) as unmatched
        FROM (
            SELECT DISTINCT jsonb_array_elements_text(es.metrics->'vehicles') AS plate
            FROM ecodriving_scores es
            WHERE DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= '2026-03-01'
              AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= '2026-03-31'
              AND (es.metrics->>'isPeriodSummary') IS NULL
              AND jsonb_typeof(es.metrics->'vehicles') = 'array'
        ) sub
        LEFT JOIN vehicles v ON v.license_plate = sub.plate
    `);
    console.log('\nPlate matching:');
    console.log(`  Total distinct plates: ${r3.rows[0].total_plates}`);
    console.log(`  Matched in vehicles table: ${r3.rows[0].matched}`);
    console.log(`  Unmatched: ${r3.rows[0].unmatched}`);

    // Check vehicles table total
    const r4 = await pool.query(`SELECT COUNT(*) as cnt FROM vehicles`);
    console.log(`\nTotal vehicles in DB: ${r4.rows[0].cnt}`);

    await pool.end();
}
run().catch(console.error);
