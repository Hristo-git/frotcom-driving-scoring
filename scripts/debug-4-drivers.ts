import pool from '../lib/db';
import { FrotcomClient } from '../lib/frotcom';

async function main() {
    const targets = ['Аклашев', 'Martin Todorov', 'Boychev', 'Благой'];

    // What's in our DB cache
    console.log('=== DB CACHE (period-summary) ===');
    for (const name of targets) {
        const r = await pool.query(`
            SELECT d.name, d.frotcom_id, es.overall_score,
                   es.metrics->>'score' as raw_score,
                   es.metrics->>'scoreCustomized' as score_cust,
                   es.metrics->>'distance' as km,
                   es.calculated_at
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            WHERE es.period_start::date = '2026-03-01'
              AND es.period_end::date = '2026-03-27'
              AND (es.metrics->>'isPeriodSummary')::boolean = true
              AND d.name ILIKE $1
        `, [`%${name}%`]);
        for (const row of r.rows) {
            console.log(`${row.name}`);
            console.log(`  frotcom_id=${row.frotcom_id}  stored_score=${row.overall_score}  raw=${row.raw_score}  cust=${row.score_cust}  km=${row.km}  cached_at=${row.calculated_at}`);
        }
    }

    // What live API returns NOW
    console.log('\n=== LIVE FROTCOM API (now) ===');
    const live = await FrotcomClient.calculateEcodriving('2026-03-01', '2026-03-27', undefined, undefined, 'driver');

    const nameRes = await pool.query(`SELECT frotcom_id, name FROM drivers`);
    const nameMap = new Map(nameRes.rows.map((r: any) => [r.frotcom_id, r.name]));

    for (const name of targets) {
        const matches = live.filter((r: any) => {
            const n = nameMap.get(r.driverId) || r.driverName || '';
            return n.toLowerCase().includes(name.toLowerCase()) || (r.driverName || '').toLowerCase().includes(name.toLowerCase());
        });
        for (const m of matches) {
            const dname = nameMap.get(m.driverId) || m.driverName;
            console.log(`${dname}  frotcom_id=${m.driverId}  score=${m.score}  scoreCustomized=${m.scoreCustomized}  distance=${m.distance}`);
        }
    }

    await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
