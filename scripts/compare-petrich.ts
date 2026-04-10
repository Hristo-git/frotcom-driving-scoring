import pool from '../lib/db';
import { FrotcomClient } from '../lib/frotcom';

async function main() {
    // Our cached period-summary scores for Petrich Mar 1-27
    const dbRes = await pool.query(`
        SELECT d.name, es.overall_score, es.metrics->>'distance' as km,
               d.frotcom_id
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        JOIN warehouses w ON d.warehouse_id = w.id
        WHERE es.period_start::date = '2026-03-01'
          AND es.period_end::date = '2026-03-27'
          AND (es.metrics->>'isPeriodSummary')::boolean = true
          AND w.name ILIKE '%Петрич%'
        ORDER BY es.overall_score::numeric DESC
    `);

    console.log('\n=== DB (cached from Frotcom API) — Петрич — 01.03–27.03 ===');
    for (const row of dbRes.rows) {
        const km = Math.round(parseFloat(row.km || '0'));
        console.log(`${row.name.substring(0, 42).padEnd(43)} ${row.overall_score.padStart(5)}  ${km} km`);
    }

    // Live Frotcom API for same period
    console.log('\n=== Live Frotcom API — Петрич — 01.03–27.03 ===');
    const liveData = await FrotcomClient.calculateEcodriving('2026-03-01', '2026-03-27', undefined, undefined, 'driver');

    // Get warehouse info for filtering
    const wRes = await pool.query(`
        SELECT d.frotcom_id, d.name, w.name as warehouse
        FROM drivers d JOIN warehouses w ON d.warehouse_id = w.id
        WHERE w.name ILIKE '%Петрич%'
    `);
    const petrichIds = new Set(wRes.rows.map((r: any) => r.frotcom_id));
    const nameMap = new Map(wRes.rows.map((r: any) => [r.frotcom_id, r.name]));

    const petrich = liveData
        .filter((r: any) => petrichIds.has(r.driverId))
        .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));

    for (const row of petrich) {
        const name = nameMap.get(row.driverId) || row.driverName || String(row.driverId);
        const score = (row.scoreCustomized ?? row.score ?? 0).toFixed(2);
        const km = Math.round(row.distance || 0);
        console.log(`${name.substring(0, 42).padEnd(43)} ${score.padStart(5)}  ${km} km`);
    }

    // Comparison
    console.log('\n=== РАЗЛИКИ (DB vs Live) ===');
    const dbMap = new Map(dbRes.rows.map((r: any) => [r.frotcom_id, parseFloat(r.overall_score)]));
    for (const row of petrich) {
        const dbScore = dbMap.get(row.driverId);
        const liveScore = row.scoreCustomized ?? row.score ?? 0;
        const name = nameMap.get(row.driverId) || String(row.driverId);
        if (dbScore !== undefined) {
            const diff = Math.abs(dbScore - liveScore);
            if (diff > 0.05) {
                console.log(`РАЗЛИКА: ${name.substring(0, 35)} DB=${dbScore.toFixed(2)} Live=${liveScore.toFixed(2)} diff=${diff.toFixed(2)}`);
            }
        }
    }

    await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
