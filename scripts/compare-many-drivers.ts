import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';

async function compareMany() {
    const engine = new ScoringEngine();
    const start = '2026-03-01';
    const end = '2026-03-27';

    console.log("Analyzing Comparison for Multiple Drivers (Mar 01 - Mar 27)...");

    // 1. Calculate our monthly score via the engine
    const ourReports = await engine.getDriverPerformance(start, end);

    // 2. Fetch all individual records from DB and aggregate their Frotcom scores
    const frotcomRes = await pool.query(`
        SELECT 
            d.name,
            es.overall_score as score,
            CAST(es.metrics->>'mileage' AS NUMERIC) as mileage
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= $1::date
          AND DATE((es.period_end AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= $2::date
    `, [start, end]);

    const frotcomAggregates = new Map<string, { weightedSum: number, totalDist: number }>();
    
    frotcomRes.rows.forEach(r => {
        if (!frotcomAggregates.has(r.name)) {
            frotcomAggregates.set(r.name, { weightedSum: 0, totalDist: 0 });
        }
        const agg = frotcomAggregates.get(r.name)!;
        const dist = parseFloat(r.mileage) || 0;
        agg.weightedSum += (r.score * dist);
        agg.totalDist += dist;
    });

    console.log("\n" + "Driver Name".padEnd(40) + " | Dist | Our Score | Frotcom | Diff");
    console.log("-".repeat(80));

    const results = ourReports
        .map(r => {
            const fAgg = frotcomAggregates.get(r.driverName);
            const fScore = fAgg && fAgg.totalDist > 0 ? fAgg.weightedSum / fAgg.totalDist : null;
            return {
                name: r.driverName,
                dist: r.distance,
                ourScore: r.score,
                fScore: fScore,
                diff: fScore !== null ? r.score - fScore : null
            };
        })
        .filter(r => r.fScore !== null && r.dist > 1000) // Focus on drivers with significant mileage
        .sort((a, b) => Math.abs(b.diff || 0) - Math.abs(a.diff || 0)); // Sort by largest discrepancy

    results.forEach(r => {
        console.log(`${r.name.padEnd(40)} | ${r.dist.toString().padStart(6)} | ${r.ourScore.toFixed(2).padEnd(9)} | ${r.fScore!.toFixed(2).padEnd(7)} | ${r.diff!.toFixed(2)}`);
    });

    await pool.end();
}

compareMany().catch(console.error);
