import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const start = '2026-03-01';
    const end   = '2026-03-31';

    // 1. Total km from period-summary rows (what "Отчети" tab shows)
    const r1 = await pool.query(`
        SELECT COUNT(*) as drivers, SUM(CAST(es.metrics->>'mileage' AS NUMERIC)) as total_km
        FROM ecodriving_scores es
        WHERE es.period_start::date = $1::date
          AND es.period_end::date   = $2::date
          AND (es.metrics->>'isPeriodSummary')::boolean = true
    `, [start, end]);
    console.log('=== Отчети tab (period-summary) ===');
    console.log(`Drivers: ${r1.rows[0].drivers}, Total km: ${parseFloat(r1.rows[0].total_km || 0).toFixed(0)}`);

    // 2. Total km from daily rows (what "Автомобили" tab queries)
    const r2 = await pool.query(`
        SELECT COUNT(*) as rows, SUM(CAST(es.metrics->>'mileage' AS NUMERIC)) as total_km
        FROM ecodriving_scores es
        WHERE DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= $1::date
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= $2::date
          AND (es.metrics->>'isPeriodSummary') IS NULL
    `, [start, end]);
    console.log('\n=== Daily rows total ===');
    console.log(`Rows: ${r2.rows[0].rows}, Total km: ${parseFloat(r2.rows[0].total_km || 0).toFixed(0)}`);

    // 3. How many daily rows have vehicles populated vs empty
    const r3 = await pool.query(`
        SELECT
            COUNT(*) FILTER (WHERE jsonb_typeof(es.metrics->'vehicles') = 'array' AND jsonb_array_length(es.metrics->'vehicles') > 0) as with_vehicles,
            COUNT(*) FILTER (WHERE jsonb_typeof(es.metrics->'vehicles') != 'array' OR jsonb_array_length(es.metrics->'vehicles') = 0) as without_vehicles,
            SUM(CAST(es.metrics->>'mileage' AS NUMERIC)) FILTER (WHERE jsonb_typeof(es.metrics->'vehicles') = 'array' AND jsonb_array_length(es.metrics->'vehicles') > 0) as km_with_vehicles,
            SUM(CAST(es.metrics->>'mileage' AS NUMERIC)) FILTER (WHERE jsonb_typeof(es.metrics->'vehicles') != 'array' OR jsonb_array_length(es.metrics->'vehicles') = 0) as km_without_vehicles
        FROM ecodriving_scores es
        WHERE DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= $1::date
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= $2::date
          AND (es.metrics->>'isPeriodSummary') IS NULL
    `, [start, end]);
    console.log('\n=== Daily rows — vehicles field breakdown ===');
    const r = r3.rows[0];
    console.log(`With vehicles: ${r.with_vehicles} rows, ${parseFloat(r.km_with_vehicles || 0).toFixed(0)} km`);
    console.log(`Without vehicles: ${r.without_vehicles} rows, ${parseFloat(r.km_without_vehicles || 0).toFixed(0)} km`);

    // 4. Sample a few daily rows to see what vehicles field looks like
    const r4 = await pool.query(`
        SELECT d.name, es.period_start::date as date,
               es.metrics->>'mileage' as km,
               es.metrics->'vehicles' as vehicles
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= $1::date
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= $2::date
          AND (es.metrics->>'isPeriodSummary') IS NULL
        ORDER BY CAST(es.metrics->>'mileage' AS NUMERIC) DESC
        LIMIT 10
    `, [start, end]);
    console.log('\n=== Sample daily rows (top 10 by km) ===');
    r4.rows.forEach((row: any) => {
        console.log(`  ${row.date} | ${row.name.padEnd(30)} | km=${parseFloat(row.km).toFixed(0).padStart(5)} | vehicles=${JSON.stringify(row.vehicles)}`);
    });

    await pool.end();
}
run().catch(console.error);
