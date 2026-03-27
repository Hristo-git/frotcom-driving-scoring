
import { ScoringEngine } from '../lib/scoring';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function verifyCalibration() {
    const engine = new ScoringEngine();
    engine.setProfile('frotcom_personalized');
    
    const targets = [
        { id: 337, name: 'Zhivko (Zhivko Georgiev Ivanov - Petrich)', start: '2026-03-01', end: '2026-03-27', target: 4.3, type: 'Highway (Month)' },
        { id: 243, name: 'Lyuben (Lyuben Vasilev-Petrich)', start: '2026-03-01', end: '2026-03-10', target: 4.8, type: '768km Segment' },
        { id: 181, name: 'Lyuben (Lyuben Vasilev - Petrich)', start: '2026-03-01', end: '2026-03-27', target: 4.6, type: 'Mixed (Month)' },
        { id: 148, name: '*Stefan Serafimov-Petrich', start: '2026-03-01', end: '2026-03-27', target: 9.0, type: 'Highway/Mixed' }
    ];

    console.log('--- Scoring Calibration Verification (Official Weights) ---');
    
    for (const t of targets) {
        const results = await engine.getDriverPerformance(t.start, t.end, { driverIds: [t.id] });
        if (results.length === 0) {
            console.log(`Driver NOT FOUND: ${t.name}`);
            continue;
        }

        const res = results[0];
        const diff = Math.abs(res.score - t.target);
        const status = diff <= 0.2 ? '✅ MATCH' : '❌ MISMATCH';

        console.log(`Driver: ${res.driverName}`);
        console.log(`  Type: ${t.type} (Target: ${t.target})`);
        console.log(`  Avg Speed: ${(res.distance / (res.drivingTime / 3600)).toFixed(1)} km/h`);
        console.log(`  Calculated Score: ${res.score}`);
        console.log(`  Distance: ${res.distance} km`);
        console.log(`  Events: Cornering(${res.events.lateralAcceleration || 0}), AccelLow(${res.events.lowSpeedAcceleration || 0}), AccelHigh(${res.events.highSpeedAcceleration || 0}), BrakeLow(${res.events.lowSpeedBreak || 0}), BrakeHigh(${res.events.highSpeedBreak || 0})`);
        console.log(`  Pedal Switch: ${res.events.accelBrakeFastShift || 0}, CC Accel: ${res.events.accWithCCActive || 0}, Idling: ${res.idling}%`);
        console.log(`  Status: ${status} (Diff: ${diff.toFixed(2)})`);
        console.log('------------------------------------');
    }

    process.exit(0);
}

verifyCalibration().catch(console.error);
