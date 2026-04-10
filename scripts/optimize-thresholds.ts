import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';

async function optimize() {
    const start = '2026-03-01';
    const end = '2026-03-27';

    const engine = new ScoringEngine();
    const reports = await engine.getDriverPerformance(start, end);

    const nikolai = reports.find(r => r.driverName.includes('Николай Красимиров'));
    const kostadin = reports.find(r => r.driverName.includes('Костадин Ангелов'));
    const zhivko = reports.find(r => r.driverName.includes('Живко Георгиев Иванов'));

    if (!nikolai || !kostadin || !zhivko) return;

    const targets = [
        { name: 'Nikolai', r: nikolai, target: 4.30 },
        { name: 'Kostadin', r: kostadin, target: 7.70 },
        { name: 'Zhivko', r: zhivko, target: 4.20 }
    ];

    console.log("Starting Grid Search for Optimal RPM/Idle Thresholds...");

    let bestError = Infinity;
    let bestRPM = [];
    let bestIdle = [];

    // Test different linear slopes for RPM and Idle
    for (let rpmEnd = -6.0; rpmEnd >= -15.0; rpmEnd -= 0.5) {
        for (let idleEnd = 0.0; idleEnd <= 15.0; idleEnd += 0.5) {
            
            const rpmThresholds = [0, rpmEnd/8, rpmEnd/4, rpmEnd*3/8, rpmEnd/2, rpmEnd*5/8, rpmEnd*3/4, rpmEnd*7/8, rpmEnd];
            const idleThresholds = [40.0, 40-(40-idleEnd)/8, 40-(40-idleEnd)/4, 40-(40-idleEnd)*3/8, 40-(40-idleEnd)/2, 40-(40-idleEnd)*5/8, 40-(40-idleEnd)*3/4, 40-(40-idleEnd)*7/8, idleEnd];

            // Patch engine mapping temporarily (not safe in parallel, but here we are synchronous)
            (global as any).SIM_RPM = rpmThresholds;
            (global as any).SIM_IDLE = idleThresholds;

            let totalError = 0;
            for (const t of targets) {
                const score = calculateSimScore(t.r, rpmThresholds, idleThresholds);
                totalError += Math.pow(score - t.target, 2);
            }

            if (totalError < bestError) {
                bestError = totalError;
                bestRPM = rpmThresholds;
                bestIdle = idleThresholds;
            }
        }
    }

    console.log("\n--- Optimal Thresholds Found ---");
    console.log("RPM Mapping:", JSON.stringify(bestRPM.map(v => parseFloat(v.toFixed(2)))));
    console.log("Idle Mapping:", JSON.stringify(bestIdle.map(v => parseFloat(v.toFixed(2)))));
    
    console.log("\n--- Verification ---");
    for (const t of targets) {
        const score = calculateSimScore(t.r, bestRPM, bestIdle);
        console.log(`${t.name}: ${score.toFixed(2)} (Target: ${t.target.toFixed(2)})`);
    }

    await pool.end();
}

function calculateSimScore(r: any, rpmT: number[], idleT: number[]) {
    const weights: any = {
        harshAccelerationLow: 0.9,
        harshAccelerationHigh: 0.75,
        harshBrakingLow: 0.65,
        harshBrakingHigh: 0.75,
        harshCornering: 0.7,
        excessiveIdling: 0.2,
        highRPM: 0.22
    };

    const distRatio = r.distance / 100;
    const engine = new ScoringEngine();
    
    // We override the internal private method logic or just simulate it here
    const getScore = (val: number, thresholds: number[], isDesc: boolean) => {
        if (isDesc) {
            if (val >= thresholds[0]) return 10.0;
            if (val <= thresholds[8]) return 1.0;
            for (let i = 0; i < 8; i++) {
                if (val <= thresholds[i] && val >= thresholds[i + 1]) {
                    const baseScore = 10 - i;
                    const range = thresholds[i] - thresholds[i+1];
                    const diff = thresholds[i] - val;
                    return baseScore - (diff / range);
                }
            }
        } else {
            if (val <= thresholds[0]) return 10.0;
            if (val >= thresholds[8]) return 1.0;
            for (let i = 0; i < 8; i++) {
                if (val >= thresholds[i] && val <= thresholds[i + 1]) {
                    const baseScore = 10 - i;
                    const range = thresholds[i+1] - thresholds[i];
                    const diff = val - thresholds[i];
                    return baseScore - (diff / range);
                }
            }
        }
        return 1.0;
    };

    const scores = {
        accelLow: getScore((r.events.lowSpeedAcceleration || 0) / distRatio, [0.08, 0.35, 0.80, 1.30, 2.00, 2.85, 3.85, 5.50, 9.00], false),
        accelHigh: getScore((r.events.highSpeedAcceleration || 0) / distRatio, [0.03, 0.08, 0.20, 0.28, 0.45, 0.65, 1.15, 1.60, 2.65], false),
        brakeLow: getScore((r.events.lowSpeedBreak || 0) / distRatio, [0.30, 0.80, 1.35, 1.75, 2.30, 3.00, 3.90, 4.90, 7.50], false),
        brakeHigh: getScore(((r.events.highSpeedBreak || 0) + (r.events.accelBrakeFastShift || 0)) / distRatio, [0.05, 0.10, 0.19, 0.30, 0.42, 0.56, 0.83, 1.21, 1.90], false),
        corner: getScore((r.events.lateralAcceleration || 0) / distRatio, [0.25, 1.20, 3.85, 7.70, 13.70, 19.70, 23.50, 35.20, 45.00], false),
        idle: getScore(r.idling, idleT, true),
        rpm: getScore(r.rpm, rpmT, true)
    };

    let weightedSum = 0;
    let totalWeight = 0;
    Object.entries(scores).forEach(([k, s]) => {
        const w = (weights as any)[k === 'accelLow' ? 'harshAccelerationLow' : k === 'accelHigh' ? 'harshAccelerationHigh' : k === 'brakeLow' ? 'harshBrakingLow' : k === 'brakeHigh' ? 'harshBrakingHigh' : k === 'corner' ? 'harshCornering' : k === 'idle' ? 'excessiveIdling' : 'highRPM'];
        weightedSum += s * w;
        totalWeight += w;
    });

    return weightedSum / totalWeight;
}

optimize().catch(console.error);
