import pool from '../lib/db';

const START = '2026-03-01';
const END   = '2026-03-27';

async function run() {
    // Event counts for the 3 drivers with biggest score gaps
    const evRes = await pool.query(`
        SELECT d.name, ev.event_type, COUNT(*) as cnt
        FROM ecodriving_events ev
        JOIN drivers d ON ev.driver_id = d.id
        WHERE (d.name ILIKE '%Stefan Serafimov%Петрич%'
            OR d.name ILIKE '%Martin Todorov%Петрич%'
            OR d.name ILIKE 'Lyuben Vasilev%Петрич%')
          AND DATE((ev.started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= $1::date
          AND DATE((ev.started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= $2::date
        GROUP BY d.name, ev.event_type
        ORDER BY d.name, cnt DESC
    `, [START, END]);

    // Scores + mileage per driver
    const scRes = await pool.query(`
        SELECT d.name,
            SUM(CAST(es.metrics->>'mileage' AS NUMERIC)) as km,
            SUM(CAST(es.overall_score AS NUMERIC) * CAST(es.metrics->>'mileage' AS NUMERIC))
              / NULLIF(SUM(CAST(es.metrics->>'mileage' AS NUMERIC)), 0) as frotcom_score,
            SUM(CAST(es.metrics->>'highRPMPerc' AS NUMERIC) * CAST(es.metrics->>'mileage' AS NUMERIC))
              / NULLIF(SUM(CAST(es.metrics->>'mileage' AS NUMERIC)), 0) as avg_rpm,
            SUM(CAST(es.metrics->>'idleTimePerc' AS NUMERIC) * CAST(es.metrics->>'mileage' AS NUMERIC))
              / NULLIF(SUM(CAST(es.metrics->>'mileage' AS NUMERIC)), 0) as avg_idle
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE (d.name ILIKE '%Stefan Serafimov%Петрич%'
            OR d.name ILIKE '%Martin Todorov%Петрич%'
            OR d.name ILIKE 'Lyuben Vasilev%Петрич%')
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= $1::date
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= $2::date
        GROUP BY d.name
    `, [START, END]);

    console.log('\n=== Driver Metrics ===');
    scRes.rows.forEach((r: any) => {
        console.log(`\n${r.name} | ${parseFloat(r.km).toFixed(1)} km | Frotcom: ${parseFloat(r.frotcom_score).toFixed(2)} | idle: ${parseFloat(r.avg_idle||0).toFixed(1)}% | rpm: ${parseFloat(r.avg_rpm||0).toFixed(1)}%`);
    });

    console.log('\n=== Events per 100km ===');
    const nameMap = new Map<string, {km: number, events: Record<string, number>}>();
    scRes.rows.forEach((r: any) => nameMap.set(r.name, {km: parseFloat(r.km), events: {}}));
    evRes.rows.forEach((r: any) => {
        for (const [name, d] of nameMap) {
            if (name.toLowerCase().includes(r.name.toLowerCase().split(' - ')[0].toLowerCase()) ||
                r.name.toLowerCase().includes(name.toLowerCase().split(' - ')[0].toLowerCase())) {
                d.events[r.event_type] = parseInt(r.cnt);
            }
        }
    });

    evRes.rows.forEach((r: any) => {
        const km = scRes.rows.find((s: any) => s.name === r.name)?.km || 1;
        const per100 = (parseInt(r.cnt) / (parseFloat(km) / 100)).toFixed(2);
        console.log(`  ${r.name.padEnd(35)} ${r.event_type.padEnd(25)} ${r.cnt.toString().padStart(5)} events = ${per100}/100km`);
    });

    await pool.end();
}
run().catch(console.error);
