import pool from '../lib/db';
import { ScoringEngine } from '../lib/scoring';
import { DEFAULT_WEIGHTS } from '../lib/scoring-types';

async function calibrate() {
    const engine = new ScoringEngine();
    const start = '2026-03-01';
    const end = '2026-03-27';

    console.log("Starting Calibration Analysis...");

    // Fetch metrics for our key drivers
    const drivers = await engine.getDriverPerformance(start, end);

    const targetDrivers = drivers.filter(d => 
        d.driverName.includes('Костадин') || 
        d.driverName.includes('Николай') || 
        d.driverName.includes('Живко')
    );

    console.log("\n--- Key Drivers Current State (RPM & Idling) ---");
    targetDrivers.forEach(d => {
        console.log(`Driver: ${d.driverName}`);
        console.log(`- Dist: ${d.distance} km`);
        console.log(`- RPM Perc: ${d.rpm}%`);
        console.log(`- Idling Perc: ${d.idling}%`);
        console.log(`- Current Score: ${d.score}`);
    });

    // Strategy: Test ranges for RPM and Idling to see how they pull the score
    // Frotcom Range for RPM usually goes from 0% (Score 10) to ~1-2% (Score 1)
    // Actually, Nikolai has 7.84 events/100km but what is his RPM %?
    
    await pool.end();
}

calibrate().catch(console.error);
