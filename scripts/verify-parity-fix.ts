import pool from '../lib/db';
import { ScoringEngine } from '../lib/scoring';

const START = '2026-03-01';
const END   = '2026-03-27';

async function run() {
    const engine = new ScoringEngine();
    const reports = await engine.getDriverPerformance(START, END);

    const dbRes = await pool.query(`
        SELECT d.name,
            SUM(CAST(es.metrics->>'mileage' AS NUMERIC)) as km,
            SUM(es.overall_score * CAST(es.metrics->>'mileage' AS NUMERIC))
              / NULLIF(SUM(CAST(es.metrics->>'mileage' AS NUMERIC)), 0) as frotcom_score
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE d.name ILIKE '%Петрич%'
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= $1::date
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= $2::date
        GROUP BY d.name
        HAVING SUM(CAST(es.metrics->>'mileage' AS NUMERIC)) >= 50
        ORDER BY d.name
    `, [START, END]);

    const fMap = new Map<string, number>();
    dbRes.rows.forEach((r: any) => fMap.set(r.name, parseFloat(r.frotcom_score)));

    const ourMap = new Map<string, number>();
    reports.forEach(r => ourMap.set(r.driverName, r.score));

    console.log('\n=== Parity check: getDriverPerformance vs Frotcom stored scores ===');
    console.log('Driver'.padEnd(43) + 'Frotcom'.padStart(9) + 'Ours'.padStart(8) + 'Diff'.padStart(7));
    console.log('─'.repeat(70));

    let sumErr = 0, n = 0;
    const rows: any[] = [];
    fMap.forEach((fScore, name) => {
        const ours = ourMap.get(name) ?? null;
        rows.push({ name, fScore, ours, diff: ours !== null ? ours - fScore : null });
    });
    rows.sort((a, b) => Math.abs(b.diff ?? 0) - Math.abs(a.diff ?? 0));
    rows.forEach(r => {
        if (r.diff === null) {
            console.log(r.name.substring(0, 42).padEnd(43) + r.fScore.toFixed(3).padStart(9) + '     —'.padStart(8) + '     —'.padStart(7));
            return;
        }
        sumErr += Math.abs(r.diff); n++;
        const flag = Math.abs(r.diff) < 0.005 ? ' ✓' : Math.abs(r.diff) < 0.05 ? ' ~' : '  ';
        console.log(r.name.substring(0,42).padEnd(43) + r.fScore.toFixed(3).padStart(9) + r.ours.toFixed(3).padStart(8) + r.diff.toFixed(3).padStart(7) + flag);
    });
    console.log('─'.repeat(70));
    if (n > 0) console.log(`Avg |diff|: ${(sumErr/n).toFixed(4)}   n=${n}   (perfect parity = 0.0000)`);
    await pool.end();
}
run().catch(console.error);
