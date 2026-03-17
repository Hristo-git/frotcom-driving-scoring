
import pool from '../lib/db';
import { ScoringEngine } from '../lib/scoring';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

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
    console.log("DB Metrics:", JSON.stringify(row.metrics, null, 2));
    console.log("DB Overall Score (stored):", row.overall_score);

    // 2. Re-calculate using updated ScoringEngine (which uses absolute values for negative metrics)
    const engine = new ScoringEngine();
    const performance = await engine.getDriverPerformance(date, date);
    const kostadin = performance.find(d => d.driverId === internalId);
    
    console.log("\nRe-calculated Performance Item:");
    console.log(JSON.stringify(kostadin, null, 2));

    const expectedFrotcom = 6.97;
    console.log(`\nFrotcom Official Dashboard Score: ${expectedFrotcom}`);
    console.log(`Internal Re-calculated Score: ${kostadin?.score}`);
    
    if (kostadin) {
        const diff = Math.abs(kostadin.score - expectedFrotcom);
        console.log(`Difference: ${diff.toFixed(4)}`);
        if (diff < 0.1) {
            console.log("✅ SUCCESS: Score is now within 0.1 range of Frotcom Dashboard!");
        } else {
            console.log("❌ STILL DISCREPANT: Score still differs significantly.");
            console.log("Possible reason: Weighting logic or missing daily metrics in the calculation.");
        }
    }
}

verify().then(() => pool.end()).catch(console.error);
