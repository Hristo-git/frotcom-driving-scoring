import { ScoringEngine } from '../lib/scoring';
import { DEFAULT_WEIGHTS } from '../lib/scoring-types';
import pool from '../lib/db';

async function optimize() {
    console.log("Starting Grid Search Optimization for 100% Parity...");

    // 1. Fetch anchor drivers
    const res = await pool.query(`
        SELECT d.name, es.overall_score as f_score, es.metrics
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE es.period_start = '2026-03-01' AND es.period_end = '2026-03-27'
          AND (d.name LIKE '%Николай Красимиров%' OR d.name LIKE '%Костадин Ангелов%' OR d.name LIKE '%Живко Георгиев%')
    `);

    const anchors = res.rows.map(r => ({
        name: r.name,
        target: parseFloat(r.f_score),
        metrics: r.metrics
    }));

    if (anchors.length < 3) {
        console.log("Could not find all 3 anchors. Check names/dates.");
        // Try searching by exact names from the previous list
        const res2 = await pool.query(`
            SELECT d.name, es.overall_score as f_score, es.metrics
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            WHERE es.metrics->>'mileage' IN ('4245.7', '7426', '5264.4')
        `);
        anchors.length = 0;
        anchors.push(...res2.rows.map(r => ({
            name: r.name,
            target: parseFloat(r.f_score),
            metrics: r.metrics
        })));
    }

    console.log(`Found ${anchors.length} anchor drivers.`);

    const engine = new ScoringEngine();
    let bestError = Infinity;
    let bestThresholds = { rpm: [] as number[], idle: [] as number[] };

    // We'll vary the "Slope" - how fast the score drops for RPM and Idle
    // Current RPM 1.0 is at 60%. Current Idle 1.0 is at 100%.
    const rpmEnds = [20, 30, 45, 60, 80, 100];
    const idleEnds = [30, 45, 60, 80, 100, 120];

    for (const rpmMax of rpmEnds) {
        for (const idleMax of idleEnds) {
            // Generate thresholds
            const rpmT = [0, rpmMax*0.05, rpmMax*0.15, rpmMax*0.25, rpmMax*0.4, rpmMax*0.55, rpmMax*0.7, rpmMax*0.85, rpmMax];
            const idleT = [0, idleMax*0.05, idleMax*0.15, idleMax*0.25, idleMax*0.4, idleMax*0.55, idleMax*0.7, idleMax*0.85, idleMax];

            // Manually inject into engine (HACK for testing)
            // @ts-ignore
            engine.THRESHOLD_MAPPING = {
                ...engine['THRESHOLD_MAPPING'],
                highRPM: rpmT,
                excessiveIdling: idleT
            };

            let currentTotalError = 0;
            anchors.forEach(a => {
                const calc = engine.calculateCustomScore(a.metrics, DEFAULT_WEIGHTS, 83);
                currentTotalError += Math.abs(calc - a.target);
            });

            if (currentTotalError < bestError) {
                bestError = currentTotalError;
                bestThresholds = { rpm: rpmT, idle: idleT };
            }
        }
    }

    console.log(`\nBest Total Absolute Error: ${bestError.toFixed(4)}`);
    console.log("Best RPM Thresholds:", bestThresholds.rpm.map(v => v.toFixed(1)).join(', '));
    console.log("Best Idle Thresholds:", bestThresholds.idle.map(v => v.toFixed(1)).join(', '));

    // Show results for the best set
    console.log("\nParity Check with Best Thresholds:");
    anchors.forEach(a => {
        const calc = engine.calculateCustomScore(a.metrics, DEFAULT_WEIGHTS, 83);
        console.log(`${a.name.padEnd(20)} | Target: ${a.target.toFixed(2)} | Calc: ${calc.toFixed(2)} | Err: ${(calc - a.target).toFixed(2)}`);
    });

    await pool.end();
}

optimize().catch(console.error);
