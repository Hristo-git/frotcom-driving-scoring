
import pool from './db';
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

export interface PerformanceReport {
    driverId: number;
    driverName: string;
    country: string;
    warehouse: string;
    countryId?: number;
    warehouseId?: number;
    score: number;
    distance: number;
    drivingTime: number;
    idling: number;
    consumption: number;
    rpm: number;
    vehicles: string[];
    recommendations: string[];
    dataPoints: number;
    events: Record<string, number>;
}

export interface AggregatedPerformance {
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

export const DEFAULT_WEIGHTS: ScoringWeights = {
    harshAccelerationLow: 0.60,
    harshAccelerationHigh: 0.50,
    harshBrakingLow: 0.45,
    harshBrakingHigh: 0.50,
    harshCornering: 0.70,
    accelBrakeSwitch: 0.02, 
    excessiveIdling: 0.0,
    highRPM: 0.0,
    alarms: 0.0,
    noCruiseControl: 0.0,
    accelDuringCruise: 0.20
};

export const RECOMMENDATION_LABELS: Record<number, string> = {
    1: 'harshAccelerationLow',
    2: 'harshAccelerationHigh',
    3: 'harshBrakingLow',
    4: 'harshBrakingHigh',
    5: 'sharpCornering',
    6: 'accelBrakeSwitch',
    7: 'excessiveIdling',
    8: 'highRPM',
    9: 'safetyAlarms',
    10: 'noCruiseControl',
    11: 'accelDuringCruise'
};

export class ScoringEngine {
    private calculateCustomScore(metrics: any, weights: ScoringWeights, avgSpeed: number): number {
        const dist = parseFloat(metrics.mileage) || 0;
        if (dist < 0.1) return 10.0;

        let score = 10.0;
        const distRatio = dist / 100;
        const counts = metrics.eventCounts || {};

        // K_base=1.05 calibrated to align with Frotcom's dashboard score across multiple profiles
        // K_actual = K_base * (avgSpeed / 83)
        const K_base = 1.05;
        const K = K_base * (avgSpeed / 83);

        const p1 = (counts.lowSpeedAcceleration || 0) / distRatio * weights.harshAccelerationLow * K;
        const p2 = (counts.highSpeedAcceleration || 0) / distRatio * weights.harshAccelerationHigh * K;
        const p3 = (counts.lowSpeedBreak || 0) / distRatio * weights.harshBrakingLow * K;
        const p4 = (counts.highSpeedBreak || 0) / distRatio * weights.harshBrakingHigh * K;
        const p5 = (counts.lateralAcceleration || 0) / distRatio * weights.harshCornering * K;
        const p6 = (counts.accelBrakeFastShift || 0) / distRatio * weights.accelBrakeSwitch * K;
        
        const p7 = (counts.accWithCCActive || 0) / distRatio * weights.accelDuringCruise * K;
        const p8 = (counts.noCruise || 0) / distRatio * weights.noCruiseControl * K;

        score -= (p1 + p2 + p3 + p4 + p5 + p6 + p7 + p8);

        // Time-based metrics (excluded by default weights=0, but kept for custom weighting)
        const idlePerc = Math.abs(parseFloat(metrics.idleTimePerc) || 0);
        if (weights.excessiveIdling > 0) {
            // Include K in idling penalty to align with other criteria
            score -= (idlePerc / 100) * weights.excessiveIdling * 10 * K;
        }

        const rpmPerc = Math.abs(parseFloat(metrics.highRPMPerc) || 0);
        if (weights.highRPM > 0) {
            score -= (rpmPerc / 100) * weights.highRPM * 10;
        }

        return Math.max(0, Math.min(10, score));
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

    async getDriverPerformance(start: string, end: string, options?: { countryNames?: string[], warehouseNames?: string[], weights?: ScoringWeights, driverIds?: number[] }): Promise<PerformanceReport[]> {
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

        if (options?.countryNames && options.countryNames.length > 0) {
            query += ` AND c.name = ANY($${paramIdx}::text[])`;
            params.push(options.countryNames);
            paramIdx++;
        }

        if (options?.warehouseNames && options.warehouseNames.length > 0) {
            query += ` AND w.name = ANY($${paramIdx}::text[])`;
            params.push(options.warehouseNames);
            paramIdx++;
        }

        if (options?.driverIds && options.driverIds.length > 0) {
            query += ` AND d.id = ANY($${paramIdx}::int[])`;
            params.push(options.driverIds);
            paramIdx++;
        }

        const weights = options?.weights || DEFAULT_WEIGHTS;

        try {
            const res = await pool.query(query, params);
            const driverMap = new Map<number, any>();

            res.rows.forEach(row => {
                const driverId = row.driver_id;
                const distance = parseFloat(row.metrics.mileage) || 0;
                const drivingTime = parseFloat(row.metrics.drivingTime) || 0;
                const idling = parseFloat(row.metrics.idleTimePerc) || 0;
                const consumption = parseFloat(row.metrics.averageConsumption) || 0;
                const rpm = parseFloat(row.metrics.highRPMPerc) || 0;
                const rowVehicles: string[] = Array.isArray(row.metrics.vehicles) ? row.metrics.vehicles : [];

                if (!driverMap.has(driverId)) {
                    driverMap.set(driverId, {
                        driver_id: driverId,
                        name: row.name,
                        country: row.country,
                        warehouse: row.warehouse,
                        country_id: row.country_id,
                        warehouse_id: row.warehouse_id,
                        totalDistance: 0,
                        totalDistanceForWeights: 0,
                        totalDrivingTime: 0,
                        totalIdlingWeighted: 0,
                        totalConsumptionWeighted: 0,
                        totalRPMWeighted: 0,
                        vehicles: new Set<string>(),
                        recommendations: new Set<string>(),
                        events: {} as Record<string, number>,
                        count: 0
                    });
                }

                const d = driverMap.get(driverId);
                const isWeightable = distance > 0;

                if (isWeightable) {
                    d.totalIdlingWeighted += idling * distance;
                    d.totalConsumptionWeighted += consumption * distance;
                    d.totalRPMWeighted += rpm * distance;
                    d.totalDistanceForWeights += distance;
                    d.count++;
                }

                d.totalDistance += distance;
                d.totalDrivingTime += drivingTime;
                rowVehicles.forEach((p: string) => d.vehicles.add(p));

                if (Array.isArray(row.metrics.failingCriteria)) {
                    row.metrics.failingCriteria.forEach((crit: string) => d.recommendations.add(crit));
                }

                if (Array.isArray(row.metrics.recommendations)) {
                    row.metrics.recommendations.forEach((id: number) => {
                        const label = RECOMMENDATION_LABELS[id];
                        if (label) d.recommendations.add(label);
                    });
                }

                if (row.metrics.eventCounts) {
                    for (const [key, val] of Object.entries(row.metrics.eventCounts)) {
                        d.events[key] = (d.events[key] || 0) + (val as number);
                    }
                }
            });

            // Fetch granular events and apply thresholding
            // Cornering: acceleration >= 3.36
            // Acceleration (low/high): acceleration >= 1.25
            // Braking (low/high): acceleration <= -2.2
            const eventQuery = `
                SELECT 
                    driver_id, event_type, COUNT(*) as count
                FROM ecodriving_events
                WHERE started_at >= ($1::timestamptz AT TIME ZONE 'Europe/Sofia')
                  AND started_at <= ($2::timestamptz AT TIME ZONE 'Europe/Sofia')
                  AND (
                    (event_type = 'lateralAcceleration' AND acceleration >= 3.36) OR
                    (event_type IN ('lowSpeedAcceleration', 'highSpeedAcceleration') AND acceleration >= 1.25) OR
                    (event_type IN ('lowSpeedBreak', 'highSpeedBreak') AND acceleration <= -2.2) OR
                    (event_type IN ('idling', 'accelBrakeFastShift', 'accWithCCActive', 'noCruise'))
                  )
                GROUP BY driver_id, event_type
            `;
            const eventRes = await pool.query(eventQuery, [start, end]);

            eventRes.rows.forEach(ev => {
                const driverId = ev.driver_id;
                const d = driverMap.get(driverId);
                if (d) {
                    const type = ev.event_type;
                    const count = parseInt(ev.count);
                    // Use granular thresholded counts instead of basic summary counts for these types
                    d.events[type] = count;
                }
            });

            return Array.from(driverMap.values()).map(d => {
                const drivingTimeHours = d.totalDrivingTime / 3600;
                const avgSpeed = drivingTimeHours > 0 ? d.totalDistance / drivingTimeHours : 83; // fallback to highway reference speed

                const aggregatedMetrics = {
                    mileage: d.totalDistance,
                    idleTimePerc: d.totalDistanceForWeights > 0 ? d.totalIdlingWeighted / d.totalDistanceForWeights : 0,
                    highRPMPerc: d.totalDistanceForWeights > 0 ? d.totalRPMWeighted / d.totalDistanceForWeights : 0,
                    eventCounts: d.events
                };

                const finalScore = this.calculateCustomScore(aggregatedMetrics, weights, avgSpeed);

                if (d.recommendations.size === 0 && finalScore < 8.0 && d.totalDistance > 0) {
                    const distRatio = d.totalDistance / 100;
                    if ((d.events.lowSpeedAcceleration || 0) / distRatio > 5) d.recommendations.add('harshAccelerationLow');
                    if ((d.events.highSpeedAcceleration || 0) / distRatio > 3) d.recommendations.add('harshAccelerationHigh');
                    if ((d.events.lowSpeedBreak || 0) / distRatio > 5) d.recommendations.add('harshBrakingLow');
                    if ((d.events.highSpeedBreak || 0) / distRatio > 3) d.recommendations.add('harshBrakingHigh');
                    if ((d.events.lateralAcceleration || 0) / distRatio > 4) d.recommendations.add('sharpCornering');
                    if ((d.events.idling || 0) / distRatio > 15) d.recommendations.add('excessiveIdling');
                    if ((d.events.highRPM || 0) / distRatio > 5) d.recommendations.add('highRPM');
                }

                return {
                    driverId: d.driver_id,
                    driverName: d.name,
                    country: d.country || 'Unknown',
                    warehouse: d.warehouse || 'Unknown',
                    countryId: d.country_id,
                    warehouseId: d.warehouse_id,
                    score: parseFloat(finalScore.toFixed(2)),
                    distance: parseFloat(d.totalDistance.toFixed(1)),
                    drivingTime: Math.round(d.totalDrivingTime),
                    idling: d.totalDistanceForWeights > 0 ? parseFloat((d.totalIdlingWeighted / d.totalDistanceForWeights).toFixed(2)) : 0,
                    consumption: d.totalDistanceForWeights > 0 ? parseFloat((d.totalConsumptionWeighted / d.totalDistanceForWeights).toFixed(2)) : 0,
                    rpm: d.totalDistanceForWeights > 0 ? parseFloat((d.totalRPMWeighted / d.totalDistanceForWeights).toFixed(2)) : 0,
                    vehicles: Array.from(d.vehicles) as string[],
                    recommendations: Array.from(d.recommendations) as string[],
                    dataPoints: d.count,
                    events: d.events
                };
            }).sort((a, b) => b.score - a.score);
        } catch (error) {
            console.error('Error in getDriverPerformance:', error);
            return [];
        }
    }

    async getCountryPerformance(start: string, end: string, options?: { warehouseNames?: string[], weights?: ScoringWeights }): Promise<AggregatedPerformance[]> {
        const drivers = await this.getDriverPerformance(start, end, { warehouseNames: options?.warehouseNames, weights: options?.weights });
        const countryMap = new Map<string, any>();

        drivers.forEach(d => {
            if (!countryMap.has(d.country)) {
                countryMap.set(d.country, { name: d.country, totalWeightedScore: 0, driversCount: 0, totalDistance: 0 });
            }
            const c = countryMap.get(d.country);
            c.totalWeightedScore += (d.score * d.distance);
            c.driversCount++;
            c.totalDistance += d.distance;
        });

        return Array.from(countryMap.values()).map(c => ({
            name: c.name,
            score: c.totalDistance > 0 ? parseFloat((c.totalWeightedScore / c.totalDistance).toFixed(2)) : 0,
            driversCount: c.driversCount,
            totalDistance: parseFloat(c.totalDistance.toFixed(2))
        })).sort((a, b) => b.score - a.score);
    }

    async getWarehousePerformance(start: string, end: string, weights?: ScoringWeights, options?: { countryNames?: string[] }): Promise<AggregatedPerformance[]> {
        const drivers = await this.getDriverPerformance(start, end, { weights, countryNames: options?.countryNames });
        const warehouseMap = new Map<string, any>();

        drivers.forEach(d => {
            if (!warehouseMap.has(d.warehouse)) {
                warehouseMap.set(d.warehouse, { name: d.warehouse, totalWeightedScore: 0, driversCount: 0, totalDistance: 0 });
            }
            const w = warehouseMap.get(d.warehouse);
            w.totalWeightedScore += (d.score * d.distance);
            w.driversCount++;
            w.totalDistance += d.distance;
        });

        return Array.from(warehouseMap.values()).map(w => ({
            name: w.name,
            score: w.totalDistance > 0 ? parseFloat((w.totalWeightedScore / w.totalDistance).toFixed(2)) : 0,
            driversCount: w.driversCount,
            totalDistance: parseFloat(w.totalDistance.toFixed(2))
        })).sort((a, b) => b.score - a.score);
    }

    async getVehiclePerformance(start: string, end: string, options?: { countryNames?: string[], warehouseNames?: string[], weights?: ScoringWeights }): Promise<VehiclePerformance[]> {
        let query = `
            SELECT 
                v.license_plate,
                v.metadata->>'manufacturer' as manufacturer,
                v.metadata->>'model' as model,
                COUNT(es.id) as trip_count,
                SUM(CAST(es.metrics->>'mileage' AS NUMERIC)) as total_distance,
                SUM(CAST(es.metrics->>'averageConsumption' AS NUMERIC) * CAST(es.metrics->>'mileage' AS NUMERIC)) as weighted_consumption,
                SUM(es.overall_score * CAST(es.metrics->>'mileage' AS NUMERIC)) as weighted_score
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

        if (options?.countryNames && options.countryNames.length > 0) {
            query += ` AND c.name = ANY($${paramIdx}::text[])`;
            params.push(options.countryNames);
            paramIdx++;
        }

        if (options?.warehouseNames && options.warehouseNames.length > 0) {
            query += ` AND w.name = ANY($${paramIdx}::text[])`;
            params.push(options.warehouseNames);
            paramIdx++;
        }

        query += `
            GROUP BY v.license_plate, manufacturer, model
            ORDER BY weighted_score DESC
        `;

        try {
            const res = await pool.query(query, params);
            return res.rows.map(row => ({
                licensePlate: row.license_plate,
                manufacturer: row.manufacturer || 'Unknown',
                model: row.model || 'Unknown',
                score: row.total_distance > 0 ? parseFloat((row.weighted_score / row.total_distance).toFixed(2)) : 0,
                distance: parseFloat(parseFloat(row.total_distance || 0).toFixed(1)),
                fuelConsumption: row.total_distance > 0 ? parseFloat((row.weighted_consumption / row.total_distance).toFixed(2)) : 0
            }));
        } catch (error) {
            console.error('Error in getVehiclePerformance:', error);
            return [];
        }
    }
}
