import { ScoringEngine } from '../lib/scoring';
import { DEFAULT_WEIGHTS } from '../lib/scoring-types';
import pool from '../lib/db';

async function simulateNoRPM() {
    const engineWithRPM = new ScoringEngine();
    
    // Create weights where RPM is 0
    const weightsNoRPM = { ...DEFAULT_WEIGHTS, highRPM: 0 };
    const engineNoRPM = new ScoringEngine(weightsNoRPM);

    const start = '2026-03-01';
    const end = '2026-03-27';

    console.log("Simulating Impact of Removing High RPM...");

    // 1. Calculate our monthly scores
    const reportsWithRPM = await engineWithRPM.getDriverPerformance(start, end);
    const reportsNoRPM = await engineNoRPM.getDriverPerformance(start, end);

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

    const fMap = new Map<string, { w: number, d: number }>();
    frotcomRes.rows.forEach(r => {
        if (!fMap.has(r.name)) fMap.set(r.name, { w: 0, d: 0 });
        const entry = fMap.get(r.name)!;
        const d = parseFloat(r.mileage) || 0;
        entry.w += (r.score * d);
        entry.d += d;
    });

    console.log("\n" + "Driver Name".padEnd(40) + " | With RPM | No RPM | Frotcom | Diff (No vs F)");
    console.log("-".repeat(95));

    reportsWithRPM
        .filter(r => r.distance > 1000)
        .forEach(r => {
            const noRPM = reportsNoRPM.find(nr => nr.driverId === r.driverId);
            const fEntry = fMap.get(r.driverName);
            const fScore = fEntry && fEntry.d > 0 ? fEntry.w / fEntry.d : null;

            if (noRPM && fScore !== null) {
                const diff = (noRPM.score - fScore).toFixed(2);
                console.log(`${r.driverName.padEnd(40)} | ${r.score.toFixed(2).padEnd(8)} | ${noRPM.score.toFixed(2).padEnd(6)} | ${fScore.toFixed(2).padEnd(7)} | ${diff}`);
            }
        });

    await pool.end();
}

simulateNoRPM().catch(console.error);
