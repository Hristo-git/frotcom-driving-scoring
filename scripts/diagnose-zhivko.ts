import { ScoringEngine } from '../lib/scoring';
import { DEFAULT_WEIGHTS } from '../lib/scoring-types';
import pool from '../lib/db';

async function diagnoseZhivko() {
    const engine = new ScoringEngine();
    const start = '2026-03-01';
    const end = '2026-03-27';

    console.log("Diagnosing Zhivko Ivanov...");

    const reports = await engine.getDriverPerformance(start, end, {
        driverIds: [], // Fetch all
    });

    const zhivko = reports.find(r => r.driverName.includes('Живко Георгиев Иванов'));

    if (!zhivko) {
        console.log("Zhivko not found.");
        return;
    }

    console.log(`\nDriver: ${zhivko.driverName}`);
    console.log(`Final Calculated Score: ${zhivko.score}`);
    console.log(`Distance: ${zhivko.distance} km`);

    // Manual recalculation to see component scores
    const distRatio = zhivko.distance / 100;
    const eventCounts = zhivko.events as any;

    const components = [
        { name: 'Accel Low', val: (eventCounts.lowSpeedAcceleration || 0) / distRatio, cat: 'harshAccelerationLow', weight: 0.9 },
        { name: 'Accel High', val: (eventCounts.highSpeedAcceleration || 0) / distRatio, cat: 'harshAccelerationHigh', weight: 0.75 },
        { name: 'Brake Low', val: (eventCounts.lowSpeedBreak || 0) / distRatio, cat: 'harshBrakingLow', weight: 0.65 },
        { name: 'Brake High', val: ((eventCounts.highSpeedBreak || 0) + (eventCounts.accelBrakeFastShift || 0)) / distRatio, cat: 'harshBrakingHigh', weight: 0.75 },
        { name: 'Cornering', val: (eventCounts.lateralAcceleration || 0) / distRatio, cat: 'harshCornering', weight: 0.7 },
        { name: 'Idling', val: zhivko.idling, cat: 'excessiveIdling', weight: 0.2 },
        { name: 'RPM', val: zhivko.rpm, cat: 'highRPM', weight: 0.22 }
    ];

    console.log("\n--- Component Breakdown ---");
    let totalWeight = 0;
    let weightedSum = 0;

    components.forEach(c => {
        const score = (engine as any).calculateCategoryScore(c.val, c.cat);
        console.log(`${c.name.padEnd(12)} | Value: ${c.val.toFixed(2).padStart(6)} | Score: ${score.toFixed(2)} | Weight: ${c.weight}`);
        weightedSum += score * c.weight;
        totalWeight += c.weight;
    });

    console.log("-".repeat(50));
    console.log(`Target Frotcom Score: 4.20`);
    console.log(`Calculated Average: ${(weightedSum / totalWeight).toFixed(2)}`);

    await pool.end();
}

diagnoseZhivko().catch(console.error);
