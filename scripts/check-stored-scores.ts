import pool from '../lib/db';

async function run() {
    // Check what overall_score actually stores for Kostadin vs Frotcom xlsx (7.343)
    const r = await pool.query(`
        SELECT d.name,
            CAST(es.overall_score AS NUMERIC) as stored_score,
            CAST(es.metrics->>'mileage' AS NUMERIC) as km,
            DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') as day
        FROM ecodriving_scores es JOIN drivers d ON es.driver_id = d.id
        WHERE d.name ILIKE '%Костадин Ангелов%'
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= '2026-03-01'
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= '2026-03-27'
        ORDER BY es.period_start
    `);
    console.log('\nKostadin per-period stored scores (Frotcom xlsx = 7.343):');
    r.rows.forEach((x: any) => {
        console.log(`  ${x.day.toISOString().substring(0,10)}  score=${parseFloat(x.stored_score).toFixed(3)}  km=${parseFloat(x.km).toFixed(1)}`);
    });
    const rows = r.rows.map((x: any) => ({ s: parseFloat(x.stored_score), km: parseFloat(x.km) }));
    const ws = rows.reduce((a: number, x: any) => a + x.s * x.km, 0);
    const wt = rows.reduce((a: number, x: any) => a + x.km, 0);
    console.log(`  → Weighted avg: ${(ws/wt).toFixed(3)}  (Frotcom = 7.343)`);

    // Also check the ecodriving sync to see if it saves Frotcom score or ours
    // Look at metrics JSON for one row
    const m = await pool.query(`
        SELECT es.overall_score, es.metrics
        FROM ecodriving_scores es JOIN drivers d ON es.driver_id = d.id
        WHERE d.name ILIKE '%Костадин Ангелов%'
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') = '2026-03-01'
        LIMIT 1
    `);
    if (m.rows[0]) {
        console.log('\nSample row metrics keys:', Object.keys(m.rows[0].metrics));
        console.log('overall_score:', m.rows[0].overall_score);
        if (m.rows[0].metrics.frotcomScore !== undefined)
            console.log('metrics.frotcomScore:', m.rows[0].metrics.frotcomScore);
        if (m.rows[0].metrics.score !== undefined)
            console.log('metrics.score:', m.rows[0].metrics.score);
    }

    await pool.end();
}
run().catch(console.error);
