import pool from '../lib/db';

async function main() {
    // Петрич is in the driver name — filter by name
    const r = await pool.query(`
        SELECT d.name, w.name as warehouse, c.name as country,
               es.overall_score,
               (es.metrics->>'distance') as km
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        LEFT JOIN warehouses w ON d.warehouse_id = w.id
        LEFT JOIN countries c ON d.country_id = c.id
        WHERE es.period_start::date = '2026-03-01'
          AND es.period_end::date = '2026-03-27'
          AND (es.metrics->>'isPeriodSummary')::boolean = true
          AND d.name ILIKE '%Петрич%'
        ORDER BY es.overall_score::numeric DESC
    `);

    console.log(`Петрич drivers (${r.rows.length}) — 01.03–27.03:`);
    for (const row of r.rows) {
        const km = Math.round(parseFloat(row.km || '0'));
        console.log(`${row.name.substring(0, 45).padEnd(46)} ${row.overall_score.padStart(5)}  ${km} km  [${row.country || row.warehouse || 'n/a'}]`);
    }

    await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
