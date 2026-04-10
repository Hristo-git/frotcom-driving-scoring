import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';

async function test() {
    const engine = new ScoringEngine();
    const start = '2026-03-01';
    const end = '2026-03-27';
    
    console.log(`Verifying Dashboard Parity [${start} to ${end}]`);
    
    // Testing Nikolai (Target: 4.30)
    const report = await engine.getDriverPerformance(start, end, {
        driverIds: [
            342, // Николай Красимиров Костадинов - Петрич
            350, // Костадин Ангелов Аклашев - Петрич
            346  // Мартин Николаев Тодоров - Петрич
        ]
    });

    console.log("\nResults:");
    console.log("--------------------------------------------------");
    report.forEach(r => {
        let target = 0;
        if (r.driverName.includes('Николай')) target = 4.30;
        if (r.driverName.includes('Костадин')) target = 7.70;
        if (r.driverName.includes('Мартин Николаев')) target = 5.40;

        console.log(`Driver: ${r.driverName}`);
        console.log(`Distance: ${r.distance} km`);
        console.log(`Calculated: ${r.score} | Target: ${target}`);
        console.log(`Delta: ${(r.score - target).toFixed(2)}`);
        console.log("--------------------------------------------------");
    });

    await pool.end();
}
test().catch(console.error);
