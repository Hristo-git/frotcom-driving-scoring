
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

function calculateCustomScore(metrics: any) {
    const idleTimePerc = Math.abs(metrics.idleTimePerc);
    const highRPMPerc = Math.abs(metrics.highRPMPerc);
    
    // Low Mileage Penalty
    let lowMileagePenalty = 0;
    if (metrics.mileage < 50) {
        lowMileagePenalty = 3;
    } else if (metrics.mileage < 100) {
        lowMileagePenalty = 2;
    } else if (metrics.mileage < 150) {
        lowMileagePenalty = 1;
    }

    // Idle Score (0-10)
    let idleScore = 10;
    if (idleTimePerc > 10) idleScore = 0;
    else if (idleTimePerc > 0) idleScore = 10 - idleTimePerc;

    // RPM Score (0-10)
    let rpmScore = 10;
    if (highRPMPerc > 10) rpmScore = 0;
    else if (highRPMPerc > 0) rpmScore = 10 - highRPMPerc;

    // Driving Score from events
    const eventScore = metrics.eventCounts?.drivingScore ?? 10;

    // Weighted Average
    const baseScore = (eventScore * 0.7) + (idleScore * 0.2) + (rpmScore * 0.1);
    return Math.max(0, baseScore - lowMileagePenalty);
}

async function verify() {
    const fId = 308028; // Kostadin
    const date = '2026-03-04';
    
    console.log(`Checking results for Kostadin on ${date}...`);
    
    const driverRes = await pool.query('SELECT frotcom_id, id FROM drivers WHERE frotcom_id = $1', [fId.toString()]);
    if (driverRes.rows.length === 0) {
        console.error("Driver not found in DB");
        return;
    }
    const internalId = driverRes.rows[0].id;

    // 1. Check raw metrics in DB
    const scoreRes = await pool.query(`
        SELECT metrics, overall_score
        FROM ecodriving_scores
        WHERE driver_id = $1 AND period_start >= $2 AND period_start < $2::date + 1
    `, [internalId, date]);

    if (scoreRes.rows.length === 0) {
        console.log("No score found in DB for this date.");
        return;
    }

    const row = scoreRes.rows[0];
    const metrics = row.metrics;
    console.log("DB Metrics:", JSON.stringify(metrics, null, 2));
    console.log("DB Overall Score (stored):", row.overall_score);

    // 2. Re-calculate using copied logic
    const calcScore = calculateCustomScore(metrics);
    
    const expectedFrotcom = 6.97;
    console.log(`\nFrotcom Official Dashboard Score: ${expectedFrotcom}`);
    console.log(`Internal Re-calculated Score: ${calcScore}`);
    
    const diff = Math.abs(calcScore - expectedFrotcom);
    console.log(`Difference: ${diff.toFixed(4)}`);
    if (diff < 0.1) {
        console.log("✅ SUCCESS: Score is now within 0.1 range of Frotcom Dashboard!");
    } else {
        console.log("❌ STILL DISCREPANT: Score still differs significantly.");
    }
}

verify().then(() => pool.end()).catch(console.error);
