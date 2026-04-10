/**
 * Test with confirmed Frotcom weights from UI
 * Safety events: 0.90 / 0.75 / 0.65 / 0.75 / 0.70
 * Excessive Idling: 20% (0.20) - user confirmed
 * High RPM: 22% (0.22) - user confirmed
 * All others: 0
 */
import pool from '../lib/db';
import { ScoringEngine } from '../lib/scoring';
import { ScoringWeights } from '../lib/scoring-types';

const FROTCOM_WEIGHTS: ScoringWeights = {
    harshAccelerationLow:  0.90,
    harshAccelerationHigh: 0.75,
    harshBrakingLow:       0.65,
    harshBrakingHigh:      0.75,
    harshCornering:        0.70,
    accelBrakeSwitch:      0.00,
    excessiveIdling:       0.20,
    highRPM:               0.22,
    alarms:                0.00,
    noCruiseControl:       0.00,
    accelDuringCruise:     0.00
};

const engine = new ScoringEngine();
const START = '2026-03-01';
const END   = '2026-03-27';
const NAME_FILTER = 'Петрич';

async function run() {
    const scoresRes = await pool.query(`
        SELECT d.id as driver_id, d.name,
            CAST(es.metrics->>'mileage' AS NUMERIC) as dist,
            CAST(es.metrics->>'highRPMPerc' AS NUMERIC) as rpm,
            CAST(es.metrics->>'idleTimePerc' AS NUMERIC) as idle,
            es.metrics->>'hasLowMileage' as has_low_mileage,
            CAST(es.overall_score AS NUMERIC) as f_score,
            DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') as day
        FROM ecodriving_scores es JOIN drivers d ON es.driver_id = d.id
        WHERE d.name ILIKE $1
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= $2::date
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= $3::date
        ORDER BY d.name, es.period_start
    `, [`%${NAME_FILTER}%`, START, END]);

    const eventsRes = await pool.query(`
        SELECT ev.driver_id,
            DATE((ev.started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') as day,
            ev.event_type, COUNT(*) as cnt
        FROM ecodriving_events ev JOIN drivers d ON ev.driver_id = d.id
        WHERE d.name ILIKE $1
          AND DATE((ev.started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= $2::date
          AND DATE((ev.started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= $3::date
        GROUP BY ev.driver_id, day, ev.event_type
    `, [`%${NAME_FILTER}%`, START, END]);

    const eventsByKey = new Map<string, Record<string, number>>();
    eventsRes.rows.forEach((r: any) => {
        const k = `${r.driver_id}|${r.day.toISOString().substring(0, 10)}`;
        if (!eventsByKey.has(k)) eventsByKey.set(k, {});
        eventsByKey.get(k)![r.event_type] = parseInt(r.cnt);
    });

    const driverMap = new Map<string, { dist: number; fW: number; newW: number }>();
    scoresRes.rows.forEach((row: any) => {
        const name = row.name;
        const dist = parseFloat(row.dist) || 0;
        const dayStr = row.day.toISOString().substring(0, 10);
        const events = eventsByKey.get(`${row.driver_id}|${dayStr}`) || {};
        const metrics = {
            mileage: dist,
            eventCounts: events,
            highRPMPerc: parseFloat(row.rpm) || 0,
            idleTimePerc: parseFloat(row.idle) || 0,
            hasLowMileage: row.has_low_mileage === 'true'
        };
        const score = engine.calculateCustomScore(metrics, FROTCOM_WEIGHTS);
        if (!driverMap.has(name)) driverMap.set(name, { dist: 0, fW: 0, newW: 0 });
        const d = driverMap.get(name)!;
        d.dist += dist;
        d.fW += (parseFloat(row.f_score) || 0) * dist;
        d.newW += score * dist;
    });

    console.log(`\nWeights: AccL=${FROTCOM_WEIGHTS.harshAccelerationLow} AccH=${FROTCOM_WEIGHTS.harshAccelerationHigh} BrkL=${FROTCOM_WEIGHTS.harshBrakingLow} BrkH=${FROTCOM_WEIGHTS.harshBrakingHigh} Corn=${FROTCOM_WEIGHTS.harshCornering} Idle=${FROTCOM_WEIGHTS.excessiveIdling} RPM=${FROTCOM_WEIGHTS.highRPM}`);
    console.log(`Filter: *${NAME_FILTER}* | ${START} → ${END}\n`);
    console.log('Driver'.padEnd(43) + 'Dist'.padStart(7) + 'Frotcom'.padStart(10) + 'Ours'.padStart(8) + 'Diff'.padStart(7));
    console.log('─'.repeat(77));

    let sumAbs = 0, n = 0;
    const rows: any[] = [];
    driverMap.forEach((d, name) => {
        if (d.dist < 50) return;
        const fr = d.dist > 0 ? d.fW / d.dist : 0;
        const nw = d.dist > 0 ? d.newW / d.dist : 0;
        rows.push({ name, dist: d.dist, fr, nw, diff: nw - fr });
    });
    rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    rows.forEach((r: any) => {
        sumAbs += Math.abs(r.diff); n++;
        const flag = Math.abs(r.diff) < 0.15 ? ' ✓' : Math.abs(r.diff) < 0.40 ? ' ~' : '  ';
        console.log(
            r.name.substring(0, 42).padEnd(43) +
            r.dist.toFixed(1).padStart(7) +
            r.fr.toFixed(2).padStart(10) +
            r.nw.toFixed(2).padStart(8) +
            r.diff.toFixed(2).padStart(7) +
            flag
        );
    });
    console.log('─'.repeat(77));
    console.log(`Avg |diff|: ${(sumAbs / n).toFixed(3)}   (previous best: 0.417)`);

    await pool.end();
}
run().catch(console.error);
