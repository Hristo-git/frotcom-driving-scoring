
import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import { RECOMMENDATION_LABELS } from '../lib/ecodriving';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function fixKostadinHistory() {
    const frotcomIdString = '297309';
    const frotcomIdNum = parseInt(frotcomIdString, 10);
    const internalDriverId = 304;

    console.log(`Fixing Kostadin (internal: ${internalDriverId}, frotcom: ${frotcomIdString}) for Feb 2026...`);

    try {
        // 1. Delete all existing corrupted scores for February
        console.log('Deleting corrupted aggregate scores for February...');
        const delRes = await pool.query(
            `DELETE FROM ecodriving_scores 
             WHERE driver_id = $1 
               AND period_start >= '2026-02-01T00:00:00Z'
               AND period_start < '2026-03-01T00:00:00Z'`,
            [internalDriverId]
        );
        console.log(`Deleted ${delRes.rowCount} corrupted records.`);

        // 2. Refetch day by day and insert
        let insertedCount = 0;
        for (let day = 1; day <= 28; day++) {
            const dateStr = `2026-02-${day.toString().padStart(2, '0')}`;
            const startStr = `${dateStr}T00:00:00`;
            const endStr = `${dateStr}T23:59:59`;

            console.log(`Fetching ${dateStr}...`);
            // DO NOT pass driverIds, Frotcom API bug hides Kostadin if we do
            const results = await FrotcomClient.calculateEcodriving(startStr, endStr, undefined, undefined, 'driver');

            if (results && results.length > 0) {
                // Frotcom ignores driverIds filtering and returns the whole fleet when grouping by driver.
                // We must manually find the driver we want.
                const record = results.find(r => r.driverId === frotcomIdNum);

                if (!record) {
                    console.log(`  Kostadin did not drive on ${dateStr}.`);
                    continue;
                }

                const mileage = (record.mileageCanbus && record.mileageCanbus > 0)
                    ? record.mileageCanbus
                    : (record.mileageGps || 0);

                if (mileage === 0) continue;

                const scoreVal = parseFloat(record.score) || 0;
                const scoreCustomizedVal = parseFloat(record.scoreCustomized) || scoreVal;

                const avgConsumption = (record.totalConsumption && record.totalConsumption > 0 && mileage > 0)
                    ? (record.totalConsumption / mileage) * 100
                    : 0;
                const avgSpeed = (record.drivingTime && record.drivingTime > 0 && mileage > 0)
                    ? mileage / (record.drivingTime / 3600)
                    : 0;

                const idleTimePerc = record.idleTimePerc !== null && record.idleTimePerc !== undefined ? parseFloat(record.idleTimePerc) : null;
                const highRPMPerc = record.highRPMPerc !== null && record.highRPMPerc !== undefined ? parseFloat(record.highRPMPerc) : null;

                const recommendationIds = record.recommendations || [];
                const failingCriteria = recommendationIds
                    .sort((a: number, b: number) => a - b)
                    .map((id: number) => RECOMMENDATION_LABELS[id] || `criterion${id}`);

                const vehicles = record.vehicles || [];
                if (record.licensePlate && !vehicles.includes(record.licensePlate)) {
                    vehicles.push(record.licensePlate);
                }

                const metricsRecord = {
                    mileage: mileage,
                    mileageCanbus: mileage, // we default to mileage
                    mileageGps: record.mileageGps || mileage,
                    drivingTime: record.drivingTime || 0,
                    totalConsumption: record.totalConsumption || 0,
                    averageConsumption: avgConsumption,
                    averageSpeed: avgSpeed,
                    idleTimePerc: idleTimePerc,
                    highRPMPerc: highRPMPerc,
                    score: scoreVal,
                    scoreCustomized: scoreCustomizedVal,
                    failingCriteria: failingCriteria,
                    hasLowMileage: record.hasLowMileage || false,
                    vehicles: vehicles,
                };

                await pool.query(
                    `INSERT INTO ecodriving_scores (
                        driver_id, period_start, period_end, overall_score, metrics
                    ) VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (driver_id, period_start, period_end)
                    DO UPDATE SET
                        overall_score = EXCLUDED.overall_score,
                        metrics = EXCLUDED.metrics,
                        calculated_at = NOW()`,
                    [
                        internalDriverId,
                        startStr,
                        endStr,
                        scoreVal,
                        JSON.stringify(metricsRecord)
                    ]
                );
                insertedCount++;
            }
        }

        console.log(`Successfully recovered ${insertedCount} daily scores for Kostadin.`);

    } catch (err: any) {
        console.error('Error fixing Kostadin history:', err.message);
    } finally {
        await pool.end();
    }
}

fixKostadinHistory();
