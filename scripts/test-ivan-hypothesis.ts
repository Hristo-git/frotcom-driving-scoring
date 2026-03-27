
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const DEFAULT_WEIGHTS = {
    harshAccelerationLow: 90.0,
    harshAccelerationHigh: 75.0,
    harshBrakingLow: 65.0,
    harshBrakingHigh: 75.0,
    harshCornering: 70.0,
    accelBrakeSwitch: 1.0, 
    excessiveIdling: 20.0,
    highRPM: 0.15,
    alarms: 0.1,
    noCruiseControl: 0.1,
    accelDuringCruise: 0.1
};

function calculateScore(metrics: any, weights: any) {
    const dist = parseFloat(metrics.mileage) || 0;
    if (dist < 0.1) return 10.0;

    const sumWeights = Object.values(weights).reduce((a: any, b: any) => a + b, 0);
    const nf = (w: number) => w / sumWeights;
    const K = 0.015;

    let score = 10.0;
    const distRatio = dist / 100;
    const counts = metrics.eventCounts || {};

    if (counts.lowSpeedAcceleration) score -= (counts.lowSpeedAcceleration / distRatio) * nf(weights.harshAccelerationLow) * K * 10;
    if (counts.highSpeedAcceleration) score -= (counts.highSpeedAcceleration / distRatio) * nf(weights.harshAccelerationHigh) * K * 15;
    if (counts.lowSpeedBreak) score -= (counts.lowSpeedBreak / distRatio) * nf(weights.harshBrakingLow) * K * 10;
    if (counts.highSpeedBreak) score -= (counts.highSpeedBreak / distRatio) * nf(weights.harshBrakingHigh) * K * 15;
    if (counts.lateralAcceleration) score -= (counts.lateralAcceleration / distRatio) * nf(weights.harshCornering) * K * 12;

    const idlePerc = Math.abs(parseFloat(metrics.idleTimePerc) || 0);
    if (idlePerc > 10 && weights.excessiveIdling > 0) {
        score -= (idlePerc - 10) * nf(weights.excessiveIdling) * 0.5;
    }

    const rpmPerc = Math.abs(parseFloat(metrics.highRPMPerc) || 0);
    if (rpmPerc > 5 && weights.highRPM > 0) {
        score -= (rpmPerc - 5) * nf(weights.highRPM) * 0.2;
    }

    return Math.max(0, Math.min(10, score));
}

async function testHypothesis() {
    const ivanId = 339;
    
    // Aggregated metrics for Mar 1-15 (including Feb 28 finishing trip to match 2199km)
    // Values from previous run:
    const metrics = {
        mileage: 2199.0,
        idleTimePerc: 26.10,
        highRPMPerc: 1.95,
        eventCounts: {
            "highSpeedBreak": 27,
            "lowSpeedBreak": 29,
            "highSpeedAcceleration": 34,
            "lowSpeedAcceleration": 24,
            "lateralAcceleration": 11,
            "highRPM": 136,
            "idling": 2
        }
    };

    console.log("Ivan Metrics (Confirmed 2199km set):", JSON.stringify(metrics, null, 2));

    const scoreStandard = calculateScore(metrics, DEFAULT_WEIGHTS);
    
    const weightsNoIdleRPM = { ...DEFAULT_WEIGHTS, excessiveIdling: 0, highRPM: 0 };
    const scoreNoIdleRPM = calculateScore(metrics, weightsNoIdleRPM);

    console.log("\nResults:");
    console.log("Standard Score (with Idle/RPM):", scoreStandard.toFixed(2));
    console.log("Score WITHOUT Idle/RPM:", scoreNoIdleRPM.toFixed(2));
    console.log("Frotcom Dashboard Target:", 5.6);
    
    // Reverse search for K
    // 10 - Penalty = 5.6 => Penalty = 4.4
    // Penalty = (EventsFactor) * K
    // Let's see if we can find a K that makes it work.
}

testHypothesis().then(() => pool.end());
