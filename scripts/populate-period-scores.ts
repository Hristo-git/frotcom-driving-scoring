import { fetchAndStorePeriodScores } from '../lib/ecodriving';
import pool from '../lib/db';

async function run() {
    // Populate period scores for specific ranges
    const periods = [
        { start: '2026-03-01', end: '2026-03-27' },
        { start: '2026-03-01', end: '2026-03-29' }, // current month-to-date
    ];

    for (const p of periods) {
        console.log(`\nStoring ${p.start} → ${p.end}...`);
        await fetchAndStorePeriodScores(p.start, p.end);
    }

    // Verify what was stored
    const res = await pool.query(`
        SELECT d.name, es.overall_score, es.period_start, es.period_end
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE (es.metrics->>'isPeriodSummary')::boolean = true
        AND d.name ILIKE '%Петрич%'
        ORDER BY es.period_start, d.name
        LIMIT 30
    `);
    console.log('\n=== Stored period summaries ===');
    res.rows.forEach((r: any) => {
        console.log(`${r.name.substring(0,35).padEnd(36)} ${r.overall_score.padStart(5)}  ${r.period_start.toISOString().substring(0,10)} → ${r.period_end.toISOString().substring(0,10)}`);
    });

    await pool.end();
}
run().catch(console.error);
