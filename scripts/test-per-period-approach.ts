/**
 * Test: Compare THREE approaches for Петрич drivers, Mar 1-27
 *
 * A) FROTCOM (exact target): distance-weighted avg of stored overall_score
 * B) CURRENT (our code):    getDriverPerformance() - aggregate all then score once
 * C) PER-DAY approach:      score each day individually (events from ecodriving_events), then distance-weight
 */
import { ScoringEngine } from '../lib/scoring';
import { DEFAULT_WEIGHTS } from '../lib/scoring-types';
import pool from '../lib/db';

const engine = new ScoringEngine();
const START = '2026-03-01';
const END   = '2026-03-27';
const NAME_FILTER = 'Петрич';

async function test() {
    // ── A & C: fetch daily ecodriving_scores rows ──────────────────────
    const scoresRes = await pool.query(`
        SELECT
            d.id as driver_id,
            d.name,
            CAST(es.metrics->>'mileage' AS NUMERIC) as dist,
            CAST(es.metrics->>'highRPMPerc' AS NUMERIC) as rpm,
            CAST(es.metrics->>'idleTimePerc' AS NUMERIC) as idle,
            es.metrics->>'hasLowMileage' as has_low_mileage,
            CAST(es.overall_score AS NUMERIC) as f_score,
            DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') as day
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE d.name ILIKE $1
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= $2::date
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= $3::date
        ORDER BY d.name, es.period_start
    `, [`%${NAME_FILTER}%`, START, END]);

    // ── C: fetch daily event counts grouped by driver+day ──────────────
    const eventsRes = await pool.query(`
        SELECT
            ev.driver_id,
            DATE((ev.started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') as day,
            ev.event_type,
            COUNT(*) as cnt
        FROM ecodriving_events ev
        JOIN drivers d ON ev.driver_id = d.id
        WHERE d.name ILIKE $1
          AND DATE((ev.started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= $2::date
          AND DATE((ev.started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= $3::date
        GROUP BY ev.driver_id, day, ev.event_type
    `, [`%${NAME_FILTER}%`, START, END]);

    // Build a lookup: driver_id + day → event counts map
    const eventsByDriverDay = new Map<string, Record<string, number>>();
    eventsRes.rows.forEach((row: any) => {
        const key = `${row.driver_id}|${row.day.toISOString().substring(0, 10)}`;
        if (!eventsByDriverDay.has(key)) eventsByDriverDay.set(key, {});
        eventsByDriverDay.get(key)![row.event_type] = parseInt(row.cnt);
    });

    // ── B: get current engine scores (uses granular events internally) ──
    const currentReports = await engine.getDriverPerformance(START, END, {
        weights: DEFAULT_WEIGHTS
    });
    const currentScoreMap = new Map<string, number>();
    currentReports.forEach(r => currentScoreMap.set(r.driverName, r.score));

    // ── Aggregate per driver ────────────────────────────────────────────
    const driverMap = new Map<string, {
        totalDist: number;
        frotcomWeighted: number;  // A
        perDayWeighted: number;   // C
    }>();

    scoresRes.rows.forEach((row: any) => {
        const name: string = row.name;
        const driverId: number = row.driver_id;
        const dist = parseFloat(row.dist) || 0;
        const fScore = parseFloat(row.f_score) || 0;
        const dayStr = row.day.toISOString().substring(0, 10);

        // Get events for this driver+day
        const key = `${driverId}|${dayStr}`;
        const dayEvents = eventsByDriverDay.get(key) || {};

        const metrics = {
            mileage: dist,
            eventCounts: dayEvents,
            highRPMPerc: parseFloat(row.rpm) || 0,
            idleTimePerc: parseFloat(row.idle) || 0,
            hasLowMileage: row.has_low_mileage === 'true'
        };

        // Per-day score using our engine with actual daily events
        const perDayScore = engine.calculateCustomScore(metrics, DEFAULT_WEIGHTS);

        if (!driverMap.has(name)) {
            driverMap.set(name, { totalDist: 0, frotcomWeighted: 0, perDayWeighted: 0 });
        }
        const d = driverMap.get(name)!;
        d.totalDist += dist;
        d.frotcomWeighted += fScore * dist;
        d.perDayWeighted += perDayScore * dist;
    });

    // ── Print results ───────────────────────────────────────────────────
    console.log(`\nFilter: *${NAME_FILTER}* | ${START} → ${END}\n`);
    console.log(
        'Driver'.padEnd(42) +
        'Dist'.padStart(7) +
        'A:Frotcom'.padStart(11) +
        'B:Current'.padStart(11) +
        'C:PerDay'.padStart(10) +
        'C-A'.padStart(7)
    );
    console.log('─'.repeat(90));

    const results: any[] = [];
    driverMap.forEach((d, name) => {
        if (d.totalDist < 50) return;
        const frotcomScore  = d.totalDist > 0 ? d.frotcomWeighted  / d.totalDist : 0;
        const perDayScore   = d.totalDist > 0 ? d.perDayWeighted   / d.totalDist : 0;
        const currentScore  = currentScoreMap.get(name) ?? null;
        results.push({ name, dist: d.totalDist, frotcomScore, currentScore, perDayScore, diffCA: perDayScore - frotcomScore });
    });

    results.sort((a, b) => Math.abs(b.diffCA) - Math.abs(a.diffCA));

    results.forEach(r => {
        const cur = r.currentScore !== null ? r.currentScore.toFixed(2).padStart(11) : '     —'.padStart(11);
        console.log(
            r.name.substring(0, 41).padEnd(42) +
            r.dist.toFixed(1).padStart(7) +
            r.frotcomScore.toFixed(2).padStart(11) +
            cur +
            r.perDayScore.toFixed(2).padStart(10) +
            r.diffCA.toFixed(2).padStart(7)
        );
    });

    const diffs = results.map(r => r.diffCA);
    const avgAbsC = diffs.reduce((s, v) => s + Math.abs(v), 0) / diffs.length;
    const diffsCB = results.filter(r => r.currentScore !== null).map(r => r.currentScore - r.frotcomScore);
    const avgAbsB = diffsCB.reduce((s, v) => s + Math.abs(v), 0) / diffsCB.length;

    console.log('─'.repeat(90));
    console.log(`Avg |diff| — B(Current): ${avgAbsB.toFixed(3)}  |  C(PerDay): ${avgAbsC.toFixed(3)}`);
    console.log(`\nTarget: C should be much closer to A (Frotcom) than B is.`);

    await pool.end();
}

test().catch(console.error);
