/**
 * Test two key fixes vs Frotcom parity:
 * FIX 1: accelBrakeFastShift NOT combined with brakeHigh (accelBrakeSwitch weight=0 in Frotcom)
 * FIX 2: rpm=100% treated as "sensor not available" → excluded from scoring denominator
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
    alarms: 0.00, noCruiseControl: 0.00, accelDuringCruise: 0.00
};

const base = new ScoringEngine();

function scoreFixed(metrics: any, weights: ScoringWeights): number {
    const mileage = metrics.mileage || 0;
    if (mileage < 10 || metrics.hasLowMileage) {
        const ec = metrics.eventCounts || {};
        if (!Object.values(ec).some((v: any) => v > 0)) return 0;
    }
    const distRatio = mileage / 100;
    if (distRatio <= 0) return 10.0;
    const ec = metrics.eventCounts || {};

    // FIX 1: brakeHigh uses ONLY highSpeedBreak, NOT accelBrakeFastShift
    const brakeHighCount = (ec.highSpeedBreak || 0);

    // FIX 2: rpm=100% → sensor not available → exclude
    const rpmVal = parseFloat(metrics.highRPMPerc) || 0;
    const rpmAvailable = rpmVal < 99.9;

    const catScores: Record<string, number> = {
        accelLow:  (base as any).calculateCategoryScore((ec.lowSpeedAcceleration || 0) / distRatio, 'harshAccelerationLow'),
        accelHigh: (base as any).calculateCategoryScore((ec.highSpeedAcceleration || 0) / distRatio, 'harshAccelerationHigh'),
        brakeLow:  (base as any).calculateCategoryScore((ec.lowSpeedBreak || 0) / distRatio, 'harshBrakingLow'),
        brakeHigh: (base as any).calculateCategoryScore(brakeHighCount / distRatio, 'harshBrakingHigh'),
        corner:    (base as any).calculateCategoryScore((ec.lateralAcceleration || 0) / distRatio, 'harshCornering'),
        idle:      (base as any).calculateCategoryScore(metrics.idleTimePerc || 0, 'excessiveIdling'),
    };

    const items: { score: number; weight: number }[] = [
        { score: catScores.accelLow,  weight: weights.harshAccelerationLow },
        { score: catScores.accelHigh, weight: weights.harshAccelerationHigh },
        { score: catScores.brakeLow,  weight: weights.harshBrakingLow },
        { score: catScores.brakeHigh, weight: weights.harshBrakingHigh },
        { score: catScores.corner,    weight: weights.harshCornering },
        { score: catScores.idle,      weight: weights.excessiveIdling },
    ];

    if (rpmAvailable && weights.highRPM > 0) {
        const rpmScore = (base as any).calculateCategoryScore(rpmVal, 'highRPM');
        items.push({ score: rpmScore, weight: weights.highRPM });
    }

    let ws = 0, wt = 0;
    items.forEach(i => { if (i.weight > 0) { ws += i.score * i.weight; wt += i.weight; } });
    if (wt === 0) return 10.0;
    return Math.min(10, Math.max(1, ws / wt));
}

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

    const evByKey = new Map<string, Record<string, number>>();
    eventsRes.rows.forEach((r: any) => {
        const k = `${r.driver_id}|${r.day.toISOString().substring(0, 10)}`;
        if (!evByKey.has(k)) evByKey.set(k, {});
        evByKey.get(k)![r.event_type] = parseInt(r.cnt);
    });

    const dm = new Map<string, { dist: number; fW: number; nW: number }>();
    scoresRes.rows.forEach((row: any) => {
        const name = row.name;
        const dist = parseFloat(row.dist) || 0;
        const dayStr = row.day.toISOString().substring(0, 10);
        const events = evByKey.get(`${row.driver_id}|${dayStr}`) || {};
        const m = {
            mileage: dist, eventCounts: events,
            highRPMPerc: parseFloat(row.rpm) || 0,
            idleTimePerc: parseFloat(row.idle) || 0,
            hasLowMileage: row.has_low_mileage === 'true'
        };
        const score = scoreFixed(m, FROTCOM_WEIGHTS);
        if (!dm.has(name)) dm.set(name, { dist: 0, fW: 0, nW: 0 });
        const d = dm.get(name)!;
        d.dist += dist;
        d.fW += (parseFloat(row.f_score) || 0) * dist;
        d.nW += score * dist;
    });

    console.log('\nFIX1: accelBrakeFastShift excluded from brakeHigh');
    console.log('FIX2: rpm=100% excluded (sensor not available)\n');
    console.log('Driver'.padEnd(43) + 'Dist'.padStart(7) + 'Frotcom'.padStart(10) + 'Fixed'.padStart(8) + 'Diff'.padStart(7));
    console.log('─'.repeat(77));

    let sum = 0, n = 0;
    const rows: any[] = [];
    dm.forEach((d, name) => {
        if (d.dist < 50) return;
        const fr = d.fW / d.dist, nw = d.nW / d.dist;
        rows.push({ name, dist: d.dist, fr, nw, diff: nw - fr });
    });
    rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    rows.forEach(r => {
        sum += Math.abs(r.diff); n++;
        const flag = Math.abs(r.diff) < 0.15 ? ' ✓' : Math.abs(r.diff) < 0.35 ? ' ~' : '  ';
        console.log(r.name.substring(0, 42).padEnd(43) + r.dist.toFixed(1).padStart(7) + r.fr.toFixed(2).padStart(10) + r.nw.toFixed(2).padStart(8) + r.diff.toFixed(2).padStart(7) + flag);
    });
    console.log('─'.repeat(77));
    console.log(`Avg |diff|: ${(sum / n).toFixed(3)}  (was 0.409 → improvement: ${(0.409 - sum / n).toFixed(3)})`);
    await pool.end();
}
run().catch(console.error);
