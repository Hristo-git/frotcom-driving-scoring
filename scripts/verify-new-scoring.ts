import { ScoringEngine } from '../lib/scoring';
import { DEFAULT_WEIGHTS } from '../lib/scoring-types';
import pool from '../lib/db';

async function verify() {
    const engine = new ScoringEngine();
    const start = '2026-03-01';
    const end = '2026-03-27';

    console.log("Verifying New Weighted Average Scoring Model...");
    console.log("Date Range:", start, "to", end);
    console.log("Weights:", JSON.stringify(DEFAULT_WEIGHTS, null, 2));

    const reports = await engine.getDriverPerformance(start, end, {
        driverIds: [], // Fetch all
    });

    const targets = [
        'Костадин Ангелов Аклашев - Петрич',
        'Николай Красимиров Костадинов - Петрич',
        'Живко Георгиев Иванов - Петрич'
    ];

    console.log("\n--- Comparison Results ---");
    reports
        .filter(r => targets.some(t => r.driverName.includes(t.split(' - ')[0])))
        .forEach(r => {
            console.log(`Driver: ${r.driverName}`);
            console.log(`Score: ${r.score}`);
            console.log(`Distance: ${r.distance} km`);
            console.log(`Events: ${JSON.stringify(r.events)}`);
            console.log("---------------------------");
        });

    await pool.end();
}

verify().catch(console.error);
