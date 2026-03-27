import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';

async function main() {
    const engine = new ScoringEngine();
    const start = '2026-03-01T00:00:00.000Z';
    const end = '2026-03-25T23:59:59.999Z';

    const report = await engine.getDriverPerformance(start, end);
    const vangel = report.find(r => r.driverName.includes('Вангел'));

    if (vangel) {
        console.log("=== VANGEL KITANOV ===");
        console.log("Calculated Score:", vangel.score);
        console.log("Distance:", vangel.distance);
        console.log("Data Points (Trips):", vangel.dataPoints);
        
        const distRatio = vangel.distance / 100;
        console.log("\nEvents per 100km:");
        console.log(" - Harsh Accel Low:", ((vangel.events.lowSpeedAcceleration || 0) / distRatio).toFixed(2));
        console.log(" - Harsh Accel High:", ((vangel.events.highSpeedAcceleration || 0) / distRatio).toFixed(2));
        console.log(" - Harsh Braking Low:", ((vangel.events.lowSpeedBreak || 0) / distRatio).toFixed(2));
        console.log(" - Harsh Braking High:", ((vangel.events.highSpeedBreak || 0) / distRatio).toFixed(2));
        console.log(" - Harsh Cornering:", ((vangel.events.lateralAcceleration || 0) / distRatio).toFixed(2));
        console.log(" - No Cruise Control:", ((vangel.events.noCruise || 0) / distRatio).toFixed(2));
        console.log(" - Accel During Cruise:", ((vangel.events.accWithCCActive || 0) / distRatio).toFixed(2));
        console.log(" - Fast Accel/Brake Shift:", ((vangel.events.accelBrakeFastShift || 0) / distRatio).toFixed(2));

        console.log("\nMetrics:");
        console.log(" - Idling %:", vangel.idling.toFixed(2));
        console.log(" - High RPM %:", vangel.rpm.toFixed(2));
    } else {
        console.log("Vangel not found in DB.");
    }
    
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
