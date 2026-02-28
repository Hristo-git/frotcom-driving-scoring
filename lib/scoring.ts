
import pool from './db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export interface ScoringWeights {
    harshAccelerationLow: number;
    harshAccelerationHigh: number;
    harshBrakingLow: number;
    harshBrakingHigh: number;
    harshCornering: number;
    accelBrakeSwitch: number;
    excessiveIdling: number;
    highRPM: number;
    alarms: number;
    noCruiseControl: number;
    accelDuringCruise: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
    harshAccelerationLow: 90,   // Резки ускорения при ниска скорост
    harshAccelerationHigh: 75,   // Резки ускорения при висока скорост
    harshBrakingLow: 65,   // Резки спирания при ниска скорост
    harshBrakingHigh: 75,   // Резки спирания при висока скорост
    harshCornering: 70,   // Рязък завой
    accelBrakeSwitch: 0,   // Рязка смяна ускорение/спирачка
    excessiveIdling: 20,   // Превишена работа на място
    highRPM: 0,   // Превишени обороти
    alarms: 0,   // Аларми
    noCruiseControl: 0,   // Без круиз контрол
    accelDuringCruise: 0,   // Ускорение при круиз контрол
};

/**
 * Maps Frotcom recommendation IDs → human-readable criteria names.
 * Used for legacy data support where recommendations were stored as numeric IDs.
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

export interface PerformanceReport {
    driverId: number;
    driverName: string;
    country: string;
    warehouse: string;
    countryId?: number;
    warehouseId?: number;
    score: number;
    distance: number;
    drivingTime: number;   // total seconds
    idling: number;
    consumption: number;
    rpm: number;
    vehicles: string[];    // license plates driven in this period
    recommendations: string[]; // failing criteria/recommendations
    dataPoints: number;
    events: Record<string, number>;
    eventCounts?: Record<string, number>;
}

export interface AggregatedPerformance {
    id?: number;
    name: string;
    score: number;
    driversCount: number;
    totalDistance: number;
}

export interface VehiclePerformance {
    licensePlate: string;
    manufacturer: string;
    model: string;
    score: number;
    distance: number;
    fuelConsumption: number;
}

export class ScoringEngine {

    private calculateCustomScore(metrics: any, weights: ScoringWeights): number {
        // Frotcom's own score is the authoritative value — it accounts for all 6 ecodriving
        // criteria (harsh accel/braking, cornering, excessive idling, RPM) using their exact thresholds.
        const baseScore = parseFloat(metrics.score) || 0;

        // When using default weights, pass Frotcom's score through directly.
        // This matches the Frotcom UI exactly and avoids approximation errors.
        if (this.weightsAreDefault(weights)) {
            return baseScore;
        }

        // --- Custom weights mode ---
        // idleTimePerc = total idle/driving time ratio (includes ALL standstill: traffic,
        // loading, etc.) — NOT just threshold-based excessive idling that Frotcom scores.
        // We treat it as an approximation.
        const idleRaw = metrics.idleTimePerc;
        const idlingVal = (idleRaw !== null && idleRaw !== undefined) ? parseFloat(idleRaw) : NaN;
        const idlingAvailable = !isNaN(idlingVal);
        // 0% → 10pts, 100% → 0pts
        const idlingScore = idlingAvailable ? Math.max(0, 10 - (idlingVal / 10)) : null;

        // highRPMPerc is null when the vehicle has no RPM sensor ("Не е достъпен").
        // Never default to 0 — that gives an artificially perfect score.
        const rpmRaw = metrics.highRPMPerc;
        const rpmVal = (rpmRaw !== null && rpmRaw !== undefined) ? parseFloat(rpmRaw) : NaN;
        const rpmAvailable = !isNaN(rpmVal);
        const rpmScore = rpmAvailable ? Math.max(0, 10 - (rpmVal / 10)) : null;

        // Effective weight total — exclude criteria with no data
        let totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        if (!idlingAvailable) totalWeight -= weights.excessiveIdling;
        if (!rpmAvailable) totalWeight -= weights.highRPM;
        if (totalWeight === 0) return baseScore;

        let weightedSum = 0;
        if (idlingAvailable && idlingScore !== null) {
            weightedSum += idlingScore * weights.excessiveIdling;
        }
        if (rpmAvailable && rpmScore !== null) {
            weightedSum += rpmScore * weights.highRPM;
        }

        // All other criteria use Frotcom's overall score as a proxy until individual
        // sub-scores (harsh accel count, braking count, etc.) are stored from the API.
        const placeholderCriteria: (keyof ScoringWeights)[] = [
            'harshAccelerationLow', 'harshAccelerationHigh', 'harshBrakingLow', 'harshBrakingHigh',
            'harshCornering', 'accelBrakeSwitch', 'alarms', 'noCruiseControl', 'accelDuringCruise'
        ];
        placeholderCriteria.forEach(c => {
            weightedSum += baseScore * weights[c];
        });

        return weightedSum / totalWeight;
    }

    private weightsAreDefault(weights: ScoringWeights): boolean {
        const d = DEFAULT_WEIGHTS;
        return (
            weights.harshAccelerationLow === d.harshAccelerationLow &&
            weights.harshAccelerationHigh === d.harshAccelerationHigh &&
            weights.harshBrakingLow === d.harshBrakingLow &&
            weights.harshBrakingHigh === d.harshBrakingHigh &&
            weights.harshCornering === d.harshCornering &&
            weights.accelBrakeSwitch === d.accelBrakeSwitch &&
            weights.excessiveIdling === d.excessiveIdling &&
            weights.highRPM === d.highRPM &&
            weights.alarms === d.alarms &&
            weights.noCruiseControl === d.noCruiseControl &&
            weights.accelDuringCruise === d.accelDuringCruise
        );
    }

    async getDriverPerformance(start: string, end: string, options?: { countryName?: string, warehouseName?: string, weights?: ScoringWeights }): Promise<PerformanceReport[]> {
        // Records are stored with period_start = Sofia midnight expressed as UTC (e.g. 2026-02-17T22:00Z
        // for Sofia date 2026-02-18). We compare calendar dates in Sofia timezone to avoid missing records
        // when the caller passes UTC midnight (e.g. 2026-02-18T00:00Z).
        let query = `
            SELECT 
                d.id as driver_id, d.name, c.name as country, w.name as warehouse,
                c.id as country_id, w.id as warehouse_id,
                es.overall_score, es.metrics,
                es.period_start, es.period_end
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            LEFT JOIN countries c ON d.country_id = c.id
            LEFT JOIN warehouses w ON d.warehouse_id = w.id
            WHERE DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia')
                  >= DATE($1::timestamptz AT TIME ZONE 'Europe/Sofia')
              AND DATE((es.period_end AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia')
                  <= DATE($2::timestamptz AT TIME ZONE 'Europe/Sofia')
        `;

        const params: any[] = [start, end];
        let paramIdx = 3;

        if (options?.countryName) {
            query += ` AND c.name = $${paramIdx}`;
            params.push(options.countryName);
            paramIdx++;
        }

        if (options?.warehouseName) {
            query += ` AND w.name = $${paramIdx}`;
            params.push(options.warehouseName);
            paramIdx++;
        }

        const weights = options?.weights || DEFAULT_WEIGHTS;

        try {
            const res = await pool.query(query, params);

            // Group by driver manually to handle custom weighting per record
            const driverMap = new Map<number, any>();

            res.rows.forEach(row => {
                const driverId = row.driver_id;
                const score = this.calculateCustomScore(row.metrics, weights);
                const distance = parseFloat(row.metrics.mileage) || 0;
                const drivingTime = parseFloat(row.metrics.drivingTime) || 0;
                const idling = parseFloat(row.metrics.idleTimePerc) || 0;
                const consumption = parseFloat(row.metrics.averageConsumption) || 0;
                const rpm = parseFloat(row.metrics.highRPMPerc) || 0;
                const rowVehicles: string[] = Array.isArray(row.metrics.vehicles) ? row.metrics.vehicles : [];

                if (!driverMap.has(driverId)) {
                    driverMap.set(driverId, {
                        ...row,
                        totalScore: 0,
                        scoreCount: 0,
                        totalDistance: 0,
                        totalDrivingTime: 0,
                        totalIdling: 0,
                        totalConsumption: 0,
                        totalRPM: 0,
                        vehicles: new Set<string>(),
                        recommendations: new Set<string>(),
                        events: {} as Record<string, number>,
                        count: 0
                    });
                }

                const d = driverMap.get(driverId);

                // Exclude low-mileage days with 0 score from the averages as they are usually data artifacts
                const isSkippedForAverage = score === 0 && row.metrics.hasLowMileage;

                if (!isSkippedForAverage) {
                    d.totalScore += score;
                    d.scoreCount++;
                    d.totalIdling += idling;
                    d.totalConsumption += consumption;
                    d.totalRPM += rpm;
                    d.count++;
                }

                d.totalDistance += distance;
                d.totalDrivingTime += drivingTime;
                rowVehicles.forEach((p: string) => d.vehicles.add(p));

                if (Array.isArray(row.metrics.failingCriteria)) {
                    row.metrics.failingCriteria.forEach((crit: string) => d.recommendations.add(crit));
                }

                // Support legacy recommendations (numeric IDs)
                if (Array.isArray(row.metrics.recommendations)) {
                    row.metrics.recommendations.forEach((id: number) => {
                        const label = RECOMMENDATION_LABELS[id];
                        if (label) d.recommendations.add(label);
                    });
                }

                // Aggregate events
                if (row.metrics.eventCounts) {
                    for (const [key, val] of Object.entries(row.metrics.eventCounts)) {
                        d.events[key] = (d.events[key] || 0) + (val as number);
                    }
                }
            });

            return Array.from(driverMap.values()).map(d => ({
                driverId: d.driver_id,
                driverName: d.name,
                country: d.country || 'Unknown',
                warehouse: d.warehouse || 'Unknown',
                countryId: d.country_id,
                warehouseId: d.warehouse_id,
                score: d.scoreCount > 0 ? parseFloat((d.totalScore / d.scoreCount).toFixed(2)) : 0,
                distance: parseFloat(d.totalDistance.toFixed(1)),
                drivingTime: Math.round(d.totalDrivingTime),
                idling: d.count > 0 ? parseFloat((d.totalIdling / d.count).toFixed(2)) : 0,
                consumption: d.count > 0 ? parseFloat((d.totalConsumption / d.count).toFixed(2)) : 0,
                rpm: d.count > 0 ? parseFloat((d.totalRPM / d.count).toFixed(2)) : 0,
                vehicles: [...d.vehicles].sort(),
                recommendations: [...d.recommendations].sort(),
                dataPoints: d.count,
                events: d.events
            })).sort((a, b) => b.score - a.score);

        } catch (error) {
            console.error('Error getting driver performance:', error);
            return [];
        }
    }

    async getCountryPerformance(start: string, end: string, options?: { warehouseName?: string, weights?: ScoringWeights }): Promise<AggregatedPerformance[]> {
        // We always get all drivers to aggregate countries, ignoring the country filter for the country list itself
        // but we support a warehouse filter to see country performance for a specific warehouse
        const drivers = await this.getDriverPerformance(start, end, { warehouseName: options?.warehouseName, weights: options?.weights });
        const countryMap = new Map<string, any>();

        drivers.forEach(d => {
            if (!countryMap.has(d.country)) {
                countryMap.set(d.country, { name: d.country, totalScore: 0, driversCount: 0, totalDistance: 0 });
            }
            const c = countryMap.get(d.country);
            c.totalScore += d.score;
            c.driversCount++;
            c.totalDistance += d.distance;
        });

        return Array.from(countryMap.values()).map(c => ({
            name: c.name,
            score: parseFloat((c.totalScore / c.driversCount).toFixed(2)),
            driversCount: c.driversCount,
            totalDistance: parseFloat(c.totalDistance.toFixed(2))
        })).sort((a, b) => b.score - a.score);
    }

    async getWarehousePerformance(start: string, end: string, weights?: ScoringWeights, options?: { countryName?: string }): Promise<AggregatedPerformance[]> {
        // Warehouse performance can be filtered by country
        const drivers = await this.getDriverPerformance(start, end, { weights, countryName: options?.countryName });
        const warehouseMap = new Map<string, any>();

        drivers.forEach(d => {
            if (!warehouseMap.has(d.warehouse)) {
                warehouseMap.set(d.warehouse, { name: d.warehouse, totalScore: 0, driversCount: 0, totalDistance: 0 });
            }
            const w = warehouseMap.get(d.warehouse);
            w.totalScore += d.score;
            w.driversCount++;
            w.totalDistance += d.distance;
        });

        return Array.from(warehouseMap.values()).map(w => ({
            name: w.name,
            score: parseFloat((w.totalScore / w.driversCount).toFixed(2)),
            driversCount: w.driversCount,
            totalDistance: parseFloat(w.totalDistance.toFixed(2))
        })).sort((a, b) => b.score - a.score);
    }

    async getVehiclePerformance(start: string, end: string, options?: { countryName?: string, warehouseName?: string, weights?: ScoringWeights }): Promise<VehiclePerformance[]> {
        // We calculate vehicle performance by re-aggregating the driver periods 
        // that hit specific vehicles, doing this via the DB jsonb_array_elements.

        let query = `
            SELECT 
                v.license_plate,
                v.metadata->>'manufacturer' as manufacturer,
                v.metadata->>'model' as model,
                COUNT(es.id) as trip_count,
                SUM(CAST(es.metrics->>'mileage' AS NUMERIC)) as total_distance,
                AVG(CAST(es.metrics->>'averageConsumption' AS NUMERIC)) as avg_consumption,
                AVG(es.overall_score) as avg_score
            FROM vehicles v
            JOIN ecodriving_scores es 
              ON v.license_plate IN (
                   SELECT jsonb_array_elements_text(es.metrics->'vehicles')
                 )
            JOIN drivers d ON es.driver_id = d.id
            LEFT JOIN countries c ON d.country_id = c.id
            LEFT JOIN warehouses w ON d.warehouse_id = w.id
            WHERE DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia')
                  >= DATE($1::timestamptz AT TIME ZONE 'Europe/Sofia')
              AND DATE((es.period_end AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia')
                  <= DATE($2::timestamptz AT TIME ZONE 'Europe/Sofia')
        `;

        const params: any[] = [start, end];
        let paramIdx = 3;

        if (options?.countryName) {
            query += ` AND c.name = $${paramIdx}`;
            params.push(options.countryName);
            paramIdx++;
        }

        if (options?.warehouseName) {
            query += ` AND w.name = $${paramIdx}`;
            params.push(options.warehouseName);
            paramIdx++;
        }

        query += `
            GROUP BY v.license_plate, manufacturer, model
            ORDER BY avg_score DESC
        `;

        try {
            const res = await pool.query(query, params);

            return res.rows.map(row => ({
                licensePlate: row.license_plate,
                manufacturer: row.manufacturer || 'Unknown',
                model: row.model || 'Unknown',
                score: parseFloat(parseFloat(row.avg_score || 0).toFixed(2)),
                distance: parseFloat(parseFloat(row.total_distance || 0).toFixed(1)),
                fuelConsumption: parseFloat(parseFloat(row.avg_consumption || 0).toFixed(2))
            }));
        } catch (error) {
            console.error('Error getting vehicle performance:', error);
            return [];
        }
    }
}
