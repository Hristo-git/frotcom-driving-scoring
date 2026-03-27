
import pool from '../lib/db';
import { FrotcomClient } from '../lib/frotcom';
import { ScoringEngine, DEFAULT_WEIGHTS } from '../lib/scoring';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    const startDate = '2026-03-01';
    const endDate = '2026-03-07'; // 1 week
    
    // Pick a driver with significant mileage
    const driverName = 'Костадин Ангелов Аклашев - Петрич';
    console.log(`Analyzing driver: ${driverName} for period ${startDate} to ${endDate}`);
    
    const driverRes = await pool.query('SELECT frotcom_id, id FROM drivers WHERE name = $1', [driverName]);
    if (driverRes.rows.length === 0) {
        console.error("Driver not found");
        return;
    }
    const { frotcom_id: fId, id: internalId } = driverRes.rows[0];
    console.log(`Driver: ${driverName}, Frotcom ID: ${fId}, Internal ID: ${internalId}`);

    // 1. Get Frotcom's single periodic score
    console.log("Fetching Frotcom's periodic score...");
    const frotcomPeriod = await FrotcomClient.calculateEcodriving(startDate, endDate, undefined, [parseInt(fId)], 'driver');
    const frotcomScore = parseFloat(frotcomPeriod[0]?.score || "0");
    const frotcomMileage = frotcomPeriod[0]?.mileageCanbus || frotcomPeriod[0]?.mileageGps || 0;

    // 2. Get our DB's aggregated score (weighted average of daily scores)
    console.log("Fetching local aggregated score...");
    const scoring = new ScoringEngine();
    const performance = await scoring.getDriverPerformance(startDate, endDate);
    const localDriver = performance.find(d => d.driverId === internalId);
    const localScore = localDriver?.score || 0;
    const localMileage = localDriver?.distance || 0;

    // 3. Manual weighted average from daily rows in DB
    const dailyRes = await pool.query(`
        SELECT overall_score, (metrics->>'mileage')::numeric as mileage
        FROM ecodriving_scores
        WHERE driver_id = $1 AND period_start >= $2 AND period_end <= $3
        ORDER BY period_start
    `, [internalId, startDate, endDate + ' 23:59:59']);
    
    let weightedSum = 0;
    let totalDist = 0;
    console.log("\nDaily scores used for local aggregation:");
    dailyRes.rows.forEach(r => {
        const s = parseFloat(r.overall_score);
        const m = parseFloat(r.mileage);
        if (m > 0) {
            weightedSum += s * m;
            totalDist += m;
            console.log(`  - ${s} * ${m.toFixed(1)} km`);
        }
    });
    const manualWeightedScore = totalDist > 0 ? weightedSum / totalDist : 0;

    console.log("\nComparison Results:");
    console.log("-------------------");
    console.log(`Frotcom Official Period Score: ${frotcomScore.toFixed(4)} (Distance: ${frotcomMileage.toFixed(2)} km)`);
    console.log(`Local Dashboard Score:         ${localScore.toFixed(4)} (Distance: ${localMileage.toFixed(2)} km)`);
    console.log(`Manual Weighted Avg:           ${manualWeightedScore.toFixed(4)} (Distance: ${totalDist.toFixed(2)} km)`);
    
    const diff = Math.abs(frotcomScore - localScore);
    console.log(`\nAbsolute Difference: ${diff.toFixed(4)}`);
    
    if (diff > 0.005) {
        console.log("Significant discrepancy detected (> 0.005). Rounding is likely the cause.");
    } else {
        console.log("Discrepancy is within 0.005 range.");
    }

    await pool.end();
}

main().catch(console.error);
