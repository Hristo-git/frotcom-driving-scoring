
import { FrotcomClient } from './frotcom';
import pool from './db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Maps Frotcom recommendation IDs → human-readable criteria names.
 * IDs observed from the API: 1-8, 11-13.
 * Order matches the Frotcom UI "Персонализирана оценка" screen:
 *   1 = Harsh acceleration (low speed)
 *   2 = Harsh acceleration (high speed)
 *   3 = Harsh braking (low speed)
 *   4 = Harsh braking (high speed)
 *   5 = Sharp cornering
 *   6 = Sudden brake/throttle change
 *   7 = Excessive idling
 *   8 = High RPM
 *   9 = Alarms
 *  10 = Time without cruise control
 *  11 = Acceleration while on cruise control
 *  12 = Unknown criterion 12
 *  13 = Unknown criterion 13
 */
export const RECOMMENDATION_LABELS: Record<number, string> = {
    1: 'harshAccelerationLow',
    2: 'harshAccelerationHigh',
    3: 'harshBrakingLow',
    4: 'harshBrakingHigh',
    5: 'sharpCornering',
    6: 'suddenBrakeThrottleChange',
    7: 'excessiveIdling',
    8: 'highRPM',
    9: 'alarms',
    10: 'timeWithoutCruiseControl',
    11: 'accelerationOnCruiseControl',
    12: 'criterion12',
    13: 'criterion13',
};

interface DriverAggregate {
    internalDriverId: number;
    totalMileage: number;
    totalMileageGps: number;
    totalDrivingTime: number;
    totalConsumption: number;
    hasLowMileage: boolean;
    // Weighted sums for percentage metrics (weighted by mileage km)
    idleWeightedSum: number;
    idleWeightKm: number;
    rpmWeightedSum: number;
    rpmWeightKm: number;
    scoreWeightedSum: number;
    scoreWeightKm: number;
    scoreCustomizedWeightedSum: number;
    scoreCustomizedWeightKm: number;
    // Recommendation IDs seen across vehicle segments (union)
    recommendationIds: Set<number>;
    vehicles: string[];
}

export async function fetchAndStoreEcodriving(start: string, end: string) {
    console.log(`Fetching ecodriving data from '${start}' to '${end}'`);

    try {
        // Build internal driver ID map: frotcom_id → internal DB id
        const driverMap = new Map<string, number>();
        const driversRes = await pool.query('SELECT id, frotcom_id FROM drivers');
        driversRes.rows.forEach((row: any) => {
            driverMap.set(row.frotcom_id.toString(), row.id);
        });

        // Build vehicle plate → assigned Frotcom driver ID map.
        // Frotcom vehicle objects may include a 'driverId' field for the administratively
        // assigned driver. Used to attribute unidentified trips (driversId=[0]).
        const vehicleDriverMap = new Map<string, string>(); // plate → driver frotcom_id
        try {
            const vehiclesRes = await pool.query('SELECT license_plate, metadata FROM vehicles');
            vehiclesRes.rows.forEach((row: any) => {
                const meta = row.metadata || {};
                const assignedDriverId =
                    meta.driverId ?? meta.driver_id ?? meta.defaultDriverId ?? meta.assignedDriverId;
                if (assignedDriverId && assignedDriverId !== 0) {
                    vehicleDriverMap.set(row.license_plate, assignedDriverId.toString());
                }
            });
            console.log(`Vehicle-driver assignments loaded: ${vehicleDriverMap.size}`);
        } catch (e) {
            console.warn('Could not load vehicle-driver assignments:', e);
        }

        // Fetch vehicle-level records (no groupBy).
        // With no groupBy, each record represents a vehicle segment and has:
        //   driversId: [X]   — dynamically identified driver (card/key)
        //   driversId: [0]   — no driver tagged → attribute via vehicle assignment
        console.log(`Fetching vehicle-level ecodriving data...`);
        const results = await FrotcomClient.calculateEcodriving(start, end);
        console.log(`Received ${results.length} vehicle-level records.`);

        // Aggregate per driver
        const driverAggregates = new Map<string, DriverAggregate>();
        let skippedNoDriver = 0;
        let skippedMultiDriver = 0;
        let attributedFromVehicle = 0;

        for (const record of results) {
            let driverFrotcomId: string | null = null;

            if (record.driverId && record.driverId !== 0) {
                driverFrotcomId = record.driverId.toString();
            } else {
                const driversId: number[] = record.driversId || [];
                const nonZeroDrivers = driversId.filter((id: number) => id !== 0);

                if (nonZeroDrivers.length === 1) {
                    driverFrotcomId = nonZeroDrivers[0].toString();
                } else if (nonZeroDrivers.length === 0) {
                    const plate = record.licensePlate || (record.vehicles && record.vehicles[0]);
                    const assignedId = plate ? vehicleDriverMap.get(plate) : null;
                    if (assignedId) {
                        driverFrotcomId = assignedId;
                        attributedFromVehicle++;
                    } else {
                        skippedNoDriver++;
                        continue;
                    }
                } else {
                    skippedMultiDriver++;
                    continue;
                }
            }
            if (!driverFrotcomId) continue;

            const internalDriverId = driverMap.get(driverFrotcomId);
            if (!internalDriverId) {
                skippedNoDriver++;
                continue;
            }

            // Prefer CANBus mileage over GPS
            const mileage = (record.mileageCanbus && record.mileageCanbus > 0)
                ? record.mileageCanbus
                : (record.mileageGps || 0);

            if (!driverAggregates.has(driverFrotcomId)) {
                driverAggregates.set(driverFrotcomId, {
                    internalDriverId,
                    totalMileage: 0,
                    totalMileageGps: 0,
                    totalDrivingTime: 0,
                    totalConsumption: 0,
                    hasLowMileage: false,
                    idleWeightedSum: 0,
                    idleWeightKm: 0,
                    rpmWeightedSum: 0,
                    rpmWeightKm: 0,
                    scoreWeightedSum: 0,
                    scoreWeightKm: 0,
                    scoreCustomizedWeightedSum: 0,
                    scoreCustomizedWeightKm: 0,
                    recommendationIds: new Set<number>(),
                    vehicles: [],
                });
            }

            const agg = driverAggregates.get(driverFrotcomId)!;
            agg.totalMileage += mileage;
            agg.totalMileageGps += (record.mileageGps || 0);
            agg.totalDrivingTime += (record.drivingTime || 0);
            agg.totalConsumption += (record.totalConsumption || 0);
            if (record.hasLowMileage) agg.hasLowMileage = true;

            // Collect all recommendation IDs (union across vehicle segments)
            (record.recommendations || []).forEach((id: number) => agg.recommendationIds.add(id));

            if (record.licensePlate && !agg.vehicles.includes(record.licensePlate)) {
                agg.vehicles.push(record.licensePlate);
            }
            if (Array.isArray(record.vehicles)) {
                record.vehicles.forEach((plate: string) => {
                    if (!agg.vehicles.includes(plate)) {
                        agg.vehicles.push(plate);
                    }
                });
            }

            // Weighted averages — only for records where the metric is present
            const scoreVal = parseFloat(record.score);
            if (!isNaN(scoreVal) && mileage > 0) {
                agg.scoreWeightedSum += scoreVal * mileage;
                agg.scoreWeightKm += mileage;
            }

            const idleVal = parseFloat(record.idleTimePerc);
            if (!isNaN(idleVal) && mileage > 0) {
                agg.idleWeightedSum += idleVal * mileage;
                agg.idleWeightKm += mileage;
            }

            const rpmVal = parseFloat(record.highRPMPerc);
            if (!isNaN(rpmVal) && mileage > 0) {
                agg.rpmWeightedSum += rpmVal * mileage;
                agg.rpmWeightKm += mileage;
            }

            const scoreCustomizedVal = parseFloat(record.scoreCustomized);
            if (!isNaN(scoreCustomizedVal) && mileage > 0) {
                agg.scoreCustomizedWeightedSum += scoreCustomizedVal * mileage;
                agg.scoreCustomizedWeightKm += mileage;
            }
        }

        console.log(
            `Attribution: ${driverAggregates.size} drivers, ` +
            `${attributedFromVehicle} unidentified trips attributed via vehicle assignment, ` +
            `${skippedNoDriver} skipped (no driver), ${skippedMultiDriver} skipped (multi-driver).`
        );

        // Store aggregated records
        let insertedCount = 0;
        for (const [_frotcomId, agg] of driverAggregates) {
            if (agg.totalMileage === 0) continue;

            // Frotcom's own score, weighted by km — most accurate baseline
            const avgScore = agg.scoreWeightKm > 0
                ? agg.scoreWeightedSum / agg.scoreWeightKm
                : 0;

            const avgConsumption = (agg.totalConsumption > 0 && agg.totalMileage > 0)
                ? (agg.totalConsumption / agg.totalMileage) * 100
                : 0;
            const avgSpeed = (agg.totalDrivingTime > 0 && agg.totalMileage > 0)
                ? agg.totalMileage / (agg.totalDrivingTime / 3600)
                : 0;

            // null = metric not available for this driver (RPM sensor absent, etc.)
            const avgIdleTimePerc = agg.idleWeightKm > 0
                ? agg.idleWeightedSum / agg.idleWeightKm
                : null;
            const avgHighRPMPerc = agg.rpmWeightKm > 0
                ? agg.rpmWeightedSum / agg.rpmWeightKm
                : null;

            const avgScoreCustomized = agg.scoreCustomizedWeightKm > 0
                ? agg.scoreCustomizedWeightedSum / agg.scoreCustomizedWeightKm
                : avgScore; // fallback to standard score if no customized data

            // Decode recommendation IDs to named criteria
            const failingCriteria = [...agg.recommendationIds]
                .sort((a, b) => a - b)
                .map(id => RECOMMENDATION_LABELS[id] || `criterion${id}`);

            const metricsRecord = {
                // Mileage
                mileage: agg.totalMileage,
                mileageCanbus: agg.totalMileage,
                mileageGps: agg.totalMileageGps,
                // Time & consumption
                drivingTime: agg.totalDrivingTime,
                totalConsumption: agg.totalConsumption,
                averageConsumption: avgConsumption,
                averageSpeed: avgSpeed,
                // Sub-criteria (only 2 available as numeric percentages from API)
                idleTimePerc: avgIdleTimePerc,
                highRPMPerc: avgHighRPMPerc,
                // Scores
                score: avgScore,
                scoreCustomized: avgScoreCustomized,
                // Frotcom recommendation flags (criteria that need improvement)
                failingCriteria,          // e.g. ['harshBrakingHigh', 'excessiveIdling']
                // Data quality flags
                hasLowMileage: agg.hasLowMileage,
                // Vehicles driven
                vehicles: agg.vehicles,
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
                    agg.internalDriverId,
                    start,
                    end,
                    avgScore,
                    JSON.stringify(metricsRecord)
                ]
            );
            insertedCount++;
        }

        console.log(`Successfully stored/updated ${insertedCount} ecodriving scores.`);

    } catch (error) {
        console.error('Error fetching/storing ecodriving data:', error);
    }
}
