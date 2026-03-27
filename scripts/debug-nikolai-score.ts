
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Mock weights based on current lib/scoring.ts
const DEFAULT_WEIGHTS = {
    harshAcceleration: 1.0,
    harshBraking: 1.0,
    harshCornering: 1.0,
    accelBrakeSwitch: 1.0,
    excessiveIdling: 0.0,
    highRPM: 0.0,
    alarms: 0.1,
    noCruiseControl: 0.1,
    accelDuringCruise: 0.1
};

const K = 0.5;

function calculateCustomScore(metrics: any, counts: any, weights = DEFAULT_WEIGHTS) {
    const mileage = parseFloat(metrics.mileage) || 0;
    if (mileage < 1) return 10.0;

    const distRatio = mileage / 100;
    let score = 10.0;

    const nf = (val: any) => parseFloat(val) || 0;

    // Event penalties
    if (counts.harshAcceleration) score -= (counts.harshAcceleration / distRatio) * nf(weights.harshAcceleration) * K;
    if (counts.harshBraking) score -= (counts.harshBraking / distRatio) * nf(weights.harshBraking) * K;
    if (counts.lateralAcceleration) score -= (counts.lateralAcceleration / distRatio) * nf(weights.harshCornering) * K * 12;
    if (counts.accelBrakeFastShift) score -= (counts.accelBrakeFastShift / distRatio) * nf(weights.accelBrakeSwitch) * K * 12;
    if (counts.accelDuringCruise) score -= (counts.accelDuringCruise / distRatio) * nf(weights.accelDuringCruise) * K * 12;
    if (counts.noCruiseControl) score -= (counts.noCruiseControl / distRatio) * nf(weights.noCruiseControl) * K * 12;

    // Time-based metrics
    const idlePerc = Math.abs(parseFloat(metrics.idleTimePerc) || 0);
    if (weights.excessiveIdling > 0) {
        score -= (idlePerc / 100) * nf(weights.excessiveIdling) * 10;
    }

    const rpmPerc = Math.abs(parseFloat(metrics.highRpmTimePerc) || 0);
    if (weights.highRPM > 0) {
        score -= (rpmPerc / 100) * nf(weights.highRPM) * 10;
    }

    return Math.max(0, Math.min(10, score));
}

async function debugNikolai() {
    try {
        const driverId = 342;
        const start = '2026-03-01';
        const end = '2026-03-15';
        
        const res = await pool.query(
            `SELECT period_start, metrics FROM ecodriving_scores 
             WHERE driver_id = $1 AND period_start >= $2 AND period_end <= $3`,
            [driverId, start, end]
        );
        
        console.log(`Analyzing Nikolai for ${res.rows.length} days...`);
        
        let totalWeightedScore = 0;
        let totalMileage = 0;
        
        for (const row of res.rows) {
            const metrics = row.metrics || {};
            const counts = metrics.eventCounts || {};
            const dist = parseFloat(metrics.mileage) || 0;
            
            const score = calculateCustomScore(metrics, counts);
            
            console.log(`Day: ${row.period_start.toISOString().split('T')[0]} | Dist: ${dist.toFixed(1)} | Score: ${score.toFixed(2)}`);
            
            totalWeightedScore += score * dist;
            totalMileage += dist;
        }
        
        if (totalMileage > 0) {
            const finalScore = totalWeightedScore / totalMileage;
            console.log(`\nFinal Calculated Score (Weighted Avg): ${finalScore.toFixed(2)}`);
            console.log(`Frotcom Dashboard Score: 4.1`);
            console.log(`Difference: ${(finalScore - 4.1).toFixed(2)}`);
        }
        
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debugNikolai();
