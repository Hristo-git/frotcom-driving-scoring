
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
    accelBrakeSwitch: 1.0, // Increased from 0.1 to see impact
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

    // Standard events
    if (counts.lowSpeedAcceleration) score -= (counts.lowSpeedAcceleration / distRatio) * nf(weights.harshAccelerationLow) * K * 10;
    if (counts.highSpeedAcceleration) score -= (counts.highSpeedAcceleration / distRatio) * nf(weights.harshAccelerationHigh) * K * 15;
    if (counts.lowSpeedBreak) score -= (counts.lowSpeedBreak / distRatio) * nf(weights.harshBrakingLow) * K * 10;
    if (counts.highSpeedBreak) score -= (counts.highSpeedBreak / distRatio) * nf(weights.harshBrakingHigh) * K * 15;
    if (counts.lateralAcceleration) score -= (counts.lateralAcceleration / distRatio) * nf(weights.harshCornering) * K * 12;

    // Missing events from our first attempt
    if (counts.accelBrakeFastShift) score -= (counts.accelBrakeFastShift / distRatio) * nf(weights.accelBrakeSwitch) * K * 5;
    if (counts.accWithCCActive) score -= (counts.accWithCCActive / distRatio) * nf(weights.accelDuringCruise) * K * 5;
    if (counts.noCruise) score -= (counts.noCruise / distRatio) * nf(weights.noCruiseControl) * K * 5;

    // Time-based
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

async function testFullHypothesis() {
    const ivanId = 339;
    
    // Aggregated metrics for Mar 1-15 (including Feb 28 finishing trip to match 2199km)
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
            "accelBrakeFastShift": 489, // Very high!
            "accWithCCActive": 6,
            "noCruise": 1,
            "highRPM": 136,
            "idling": 2
        }
    };

    console.log("\nResults with Full Event Weights:");
    
    const scStandard = calculateScore(metrics, DEFAULT_WEIGHTS);
    console.log("1. Full Formula (with Idle/RPM, default weights):", scStandard.toFixed(2));

    const weightsNoIdleRPM = { ...DEFAULT_WEIGHTS, excessiveIdling: 0, highRPM: 0 };
    const scNoIdleRPM = calculateScore(metrics, weightsNoIdleRPM);
    console.log("2. Full Formula (WITHOUT Idle/RPM):", scNoIdleRPM.toFixed(2));

    // What if Frotcom has very different weights?
    // Let's try high weights for braking/cornering
    const aggressiveWeights = {
        ...DEFAULT_WEIGHTS,
        harshBrakingHigh: 200,
        harshAccelerationHigh: 200,
        accelBrakeSwitch: 50
    };
    const scAggressive = calculateScore(metrics, aggressiveWeights);
    console.log("3. Aggressive Event Weights (Switch=50):", scAggressive.toFixed(2));

    console.log("\nFrotcom Dashboard Target:", 5.6);
}

testFullHypothesis().then(() => pool.end());
