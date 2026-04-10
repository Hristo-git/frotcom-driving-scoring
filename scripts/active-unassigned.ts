import pool from '../lib/db';

async function main() {
    // Active drivers (with period-summary Mar 1-27) without country
    const r = await pool.query(`
        SELECT d.name, d.country_id, d.warehouse_id,
               c.name as country, w.name as warehouse,
               es.overall_score
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        LEFT JOIN countries c ON d.country_id = c.id
        LEFT JOIN warehouses w ON d.warehouse_id = w.id
        WHERE es.period_start::date = '2026-03-01'
          AND es.period_end::date = '2026-03-27'
          AND (es.metrics->>'isPeriodSummary')::boolean = true
          AND (d.country_id IS NULL OR d.warehouse_id IS NULL)
        ORDER BY d.name
    `);
    console.log(`Active drivers without country/warehouse (${r.rows.length}):`);
    for (const row of r.rows) {
        console.log(`  ${row.name.padEnd(48)} score=${row.overall_score}  country=${row.country || 'NULL'}  warehouse=${row.warehouse || 'NULL'}`);
    }

    // Also show breakdown of active drivers by country
    const r2 = await pool.query(`
        SELECT c.name as country, COUNT(*) as cnt
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        LEFT JOIN countries c ON d.country_id = c.id
        WHERE es.period_start::date = '2026-03-01'
          AND es.period_end::date = '2026-03-27'
          AND (es.metrics->>'isPeriodSummary')::boolean = true
        GROUP BY c.name
        ORDER BY cnt DESC
    `);
    console.log('\nActive drivers by country:');
    for (const row of r2.rows) {
        console.log(`  ${(row.country || 'NULL').padEnd(30)} ${row.cnt}`);
    }

    await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
