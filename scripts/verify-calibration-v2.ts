
import { ScoringEngine } from '../lib/scoring';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function verifyCalibration() {
    const engine = new ScoringEngine();
    
    const targets = [
        { id: 337, name: 'Живко Георгиев Иванов - Петрич', start: '2026-02-14', end: '2026-02-15', target: 4.3, type: 'Highway' },
        { id: 181, name: 'Lyuben Vasilev - Петрич', start: '2026-03-01', end: '2026-03-26', target: 4.6, type: 'City/Mixed' },
        { id: 148, name: '*Stefan Serafimov-Петрич', start: '2026-03-01', end: '2026-03-26', target: 9.0, type: 'Highway/Mixed' }
    ];

    console.log('--- Scoring Calibration Verification ---');
    console.log('Thresholds: Cornering(3.36), Accel(1.25), Braking(-2.2)');
    console.log('Formula: K = 1.24 * (avgSpeed / 83)\n');

    for (const test of targets) {
        // Fetch performance for the specific driver
        const results = await engine.getDriverPerformance(test.start, test.end, { driverIds: [test.id] });
        const driver = results[0];

        if (driver) {
            const avgSpeed = driver.drivingTime > 0 ? (driver.distance / (driver.drivingTime / 3600)) : 0;
            console.log(`Driver: ${driver.driverName}`);
            console.log(`  Type: ${test.type} (Target: ${test.target})`);
            console.log(`  Avg Speed: ${avgSpeed.toFixed(1)} km/h`);
            console.log(`  Calculated Score: ${driver.score}`);
            console.log(`  Distance: ${driver.distance} km`);
            console.log(`  Events: Cornering(${driver.events.lateralAcceleration || 0}), Accel(${ (driver.events.lowSpeedAcceleration || 0) + (driver.events.highSpeedAcceleration || 0) }), Brake(${ (driver.events.lowSpeedBreak || 0) + (driver.events.highSpeedBreak || 0) })`);
            const diff = Math.abs(driver.score - test.target);
            console.log(`  Status: ${diff <= 0.2 ? '✅ MATCH' : '❌ MISMATCH (Diff: ' + diff.toFixed(2) + ')'}`);
            console.log('------------------------------------');
        } else {
            console.log(`Driver NOT FOUND: ${test.name}`);
        }
    }
}

verifyCalibration().catch(console.error);
