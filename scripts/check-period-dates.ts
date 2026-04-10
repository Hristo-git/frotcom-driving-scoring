import pool from '../lib/db';
async function main() {
    const r = await pool.query(`
        SELECT
            es.period_start::text as ps_text,
            es.period_end::text as pe_text,
            (es.period_start AT TIME ZONE 'Europe/Sofia')::date as ps_sofia,
            (es.period_end   AT TIME ZONE 'Europe/Sofia')::date as pe_sofia,
            es.overall_score,
            d.name
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE (es.metrics->>'isPeriodSummary')::boolean = true
        LIMIT 5
    `);
    for (const row of r.rows) {
        console.log(`${row.ps_text} (sofia: ${row.ps_sofia}) -> ${row.pe_text} (sofia: ${row.pe_sofia}) | ${row.name} | ${row.overall_score}`);
    }

    // Test ::date cast approach
    const r2 = await pool.query(`
        SELECT COUNT(*) as cnt
        FROM ecodriving_scores es
        WHERE es.period_start::date = '2026-03-01'::date
          AND es.period_end::date = '2026-03-27'::date
          AND (es.metrics->>'isPeriodSummary')::boolean = true
    `);
    console.log('\nRows matching 2026-03-01 -> 2026-03-27 with ::date cast:', r2.rows[0].cnt);

    await pool.end();
}
main().catch(e => console.error(e.message));
