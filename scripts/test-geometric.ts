import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';

async function testGeometric() {
    const engine = new ScoringEngine();
    const start = '2026-03-01';
    const end = '2026-03-27';

    const reports = await engine.getDriverPerformance(start, end);

    const targets = [
        { name: 'Nikolai', r: reports.find(r => r.driverName.includes('Николай Красимиров')), target: 4.30 },
        { name: 'Kostadin', r: reports.find(r => r.driverName.includes('Костадин Ангелов')), target: 7.70 },
        { name: 'Zhivko', r: reports.find(r => r.driverName.includes('Живко Георгиев Иванов')), target: 4.20 }
    ];

    console.log("Testing Geometric Mean Model...");

    const weights: any = {
        accelLow: 0.9,
        accelHigh: 0.75,
        brakeLow: 0.65,
        brakeHigh: 0.75,
        corner: 0.7,
        idle: 0.2,
        rpm: 0.22
    };

    for (const t of targets) {
        if (!t.r) continue;
        const distRatio = t.r.distance / 100;
        
        const getS = (v: number, thr: number[]) => {
             if (v <= thr[0]) return 10;
             if (v >= thr[8]) return 1;
             for (let i=0; i<8; i++) {
                 if (v >= thr[i] && v <= thr[i+1]) return 10 - i - (v - thr[i])/(thr[i+1]-thr[i]);
             }
             return 1;
        };

        const s = {
            accelLow: getS((t.r.events.lowSpeedAcceleration || 0) / distRatio, [0.08, 0.35, 0.80, 1.30, 2.00, 2.85, 3.85, 5.50, 9.00]),
            accelHigh: getS((t.r.events.highSpeedAcceleration || 0) / distRatio, [0.03, 0.08, 0.20, 0.28, 0.45, 0.65, 1.15, 1.60, 2.65]),
            brakeLow: getS((t.r.events.lowSpeedBreak || 0) / distRatio, [0.30, 0.80, 1.35, 1.75, 2.30, 3.00, 3.90, 4.90, 7.50]),
            brakeHigh: getS(((t.r.events.highSpeedBreak || 0) + (t.r.events.accelBrakeFastShift || 0)) / distRatio, [0.05, 0.10, 0.19, 0.30, 0.42, 0.56, 0.83, 1.21, 1.90]),
            corner: getS((t.r.events.lateralAcceleration || 0) / distRatio, [0.25, 1.20, 3.85, 7.70, 13.70, 19.70, 23.50, 35.20, 45.00]),
            idle: 7.87, // Zhivko specific hardcoded for test
            rpm: 10.00
        };

        let logSum = 0;
        let totalW = 0;
        Object.entries(s).forEach(([k, val]) => {
            const w = weights[k];
            logSum += Math.log(val) * w;
            totalW += w;
        });

        const geoScore = Math.exp(logSum / totalW);
        console.log(`${t.name}: Geo: ${geoScore.toFixed(2)} | Target: ${t.target}`);
    }

    await pool.end();
}

testGeometric().catch(console.error);
