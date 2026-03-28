import pool from './db';
import { 
    ScoringWeights, 
    PerformanceReport, 
    AggregatedPerformance, 
    VehiclePerformance, 
    DEFAULT_WEIGHTS,
    RECOMMENDATION_LABELS
} from './scoring-types';

export { 
    type ScoringWeights, 
    type PerformanceReport, 
    type AggregatedPerformance, 
    type VehiclePerformance, 
    DEFAULT_WEIGHTS,
    RECOMMENDATION_LABELS
};

const CALIBRATION = {
    k_accelLow: 0.06431,
    k_accelHigh: 0.09226,
    k_brakeLow: 0.01614,
    k_brakeHigh: 0.00512,
    k_corner: 0.06692,
    k_idle: 0.00151,
    k_cc: 0.0125
};

export class ScoringEngine {
    private currentWeights: ScoringWeights = DEFAULT_WEIGHTS;

    constructor(customWeights?: ScoringWeights) {
        if (customWeights) {
            this.currentWeights = { ...DEFAULT_WEIGHTS, ...customWeights };
        }
    }

    /**
     * Highly Accurate Joint Exponential Model
     * Penalty = Points/100km * Weight * K
     * Score = 10 * exp(-totalPenalty)
     */
    public calculateCustomScore(metrics: any, weights: ScoringWeights, avgSpeed: number): number {
        const mileage = metrics.mileage || 0;
        const distRatio = mileage / 100;
        
        if (distRatio <= 0) return 10.0;

        const eventCounts = metrics.eventCounts || {};
        
        const p_accelLow = (eventCounts.lowSpeedAcceleration || 0) / distRatio * weights.harshAccelerationLow * CALIBRATION.k_accelLow;
        const p_accelHigh = (eventCounts.highSpeedAcceleration || 0) / distRatio * weights.harshAccelerationHigh * CALIBRATION.k_accelHigh;
        const p_brakeLow = (eventCounts.lowSpeedBreak || 0) / distRatio * weights.harshBrakingLow * CALIBRATION.k_brakeLow;
        const p_brakeHigh = ((eventCounts.highSpeedBreak || 0) + (eventCounts.accelBrakeFastShift || 0)) / distRatio * weights.harshBrakingHigh * CALIBRATION.k_brakeHigh;
        const p_corner = (eventCounts.lateralAcceleration || 0) / distRatio * weights.harshCornering * CALIBRATION.k_corner;
        const p_idle = (metrics.idleTimePerc || 0) * weights.excessiveIdling * CALIBRATION.k_idle;
        const p_cc = (eventCounts.noCruise || 0) / distRatio * weights.noCruiseControl * CALIBRATION.k_cc;

        const totalPenalty = p_accelLow + p_accelHigh + p_brakeLow + p_brakeHigh + p_corner + p_idle + p_cc;
        const finalScore = 10 * Math.exp(-totalPenalty);

        return Math.min(10, Math.max(1, finalScore));
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
            WHERE DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= $1::date
              AND DATE((es.period_end AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= $2::date
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

        const weights = options?.weights || this.currentWeights;

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
                if (distance > 0) {
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

            // Fetch thresholded granular events for custom scoring
            const eventQuery = `
                SELECT 
                    driver_id, event_type, COUNT(*) as count
                FROM ecodriving_events
                WHERE DATE((started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia')
                      BETWEEN $1::date AND $2::date
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
                    d.events[ev.event_type] = parseInt(ev.count);
                }
            });

            return Array.from(driverMap.values()).map(d => {
                const drivingTimeHours = d.totalDrivingTime / 3600;
                const avgSpeed = drivingTimeHours > 0 ? d.totalDistance / drivingTimeHours : 83;

                const aggregatedMetrics = {
                    mileage: d.totalDistance,
                    idleTimePerc: d.totalDistanceForWeights > 0 ? d.totalIdlingWeighted / d.totalDistanceForWeights : 0,
                    highRPMPerc: d.totalDistanceForWeights > 0 ? d.totalRPMWeighted / d.totalDistanceForWeights : 0,
                    eventCounts: d.events
                };

                const finalScore = this.calculateCustomScore(aggregatedMetrics, weights, avgSpeed);

                return {
                    driverId: d.driver_id,
                    driverName: d.name,
                    country: d.country || 'Other',
                    warehouse: d.warehouse || 'Other',
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
        const weights = options?.weights || this.currentWeights;

        drivers.forEach(d => {
            if (!countryMap.has(d.country)) {
                countryMap.set(d.country, { name: d.country, totalDistance: 0, totalIdleWeighted: 0, totalRPMWeighted: 0, events: {} as Record<string, number>, driversCount: 0 });
            }
            const c = countryMap.get(d.country);
            c.totalDistance += d.distance;
            c.totalIdleWeighted += (d.idling * d.distance);
            c.totalRPMWeighted += (d.rpm * d.distance);
            c.driversCount++;
            if (d.events) {
                Object.entries(d.events).forEach(([k, v]) => { c.events[k] = (c.events[k] || 0) + (v as number); });
            }
        });

        return Array.from(countryMap.values()).map(c => {
            const aggregatedMetrics = { mileage: c.totalDistance, idleTimePerc: c.totalDistance > 0 ? c.totalIdleWeighted / c.totalDistance : 0, eventCounts: c.events };
            const score = this.calculateCustomScore(aggregatedMetrics, weights, 83);
            return { name: c.name, score: parseFloat(score.toFixed(2)), driversCount: c.driversCount, totalDistance: parseFloat(c.totalDistance.toFixed(2)) };
        }).sort((a, b) => b.score - a.score);
    }

    async getWarehousePerformance(start: string, end: string, weights?: ScoringWeights, options?: { countryNames?: string[] }): Promise<AggregatedPerformance[]> {
        const drivers = await this.getDriverPerformance(start, end, { weights, countryNames: options?.countryNames });
        const warehouseMap = new Map<string, any>();
        const activeWeights = weights || this.currentWeights;

        drivers.forEach(d => {
            if (!warehouseMap.has(d.warehouse)) {
                warehouseMap.set(d.warehouse, { name: d.warehouse, totalDistance: 0, totalIdleWeighted: 0, totalRPMWeighted: 0, events: {} as Record<string, number>, driversCount: 0 });
            }
            const w = warehouseMap.get(d.warehouse);
            w.totalDistance += d.distance;
            w.totalIdleWeighted += (d.idling * d.distance);
            w.totalRPMWeighted += (d.rpm * d.distance);
            w.driversCount++;
            if (d.events) {
                Object.entries(d.events).forEach(([k, v]) => { w.events[k] = (w.events[k] || 0) + (v as number); });
            }
        });

        return Array.from(warehouseMap.values()).map(w => {
            const aggregatedMetrics = { mileage: w.totalDistance, idleTimePerc: w.totalDistance > 0 ? w.totalIdleWeighted / w.totalDistance : 0, eventCounts: w.events };
            const score = this.calculateCustomScore(aggregatedMetrics, activeWeights, 83);
            return { name: w.name, score: parseFloat(score.toFixed(2)), driversCount: w.driversCount, totalDistance: parseFloat(w.totalDistance.toFixed(2)) };
        }).sort((a, b) => b.score - a.score);
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
            JOIN ecodriving_scores es ON v.license_plate IN (SELECT jsonb_array_elements_text(es.metrics->'vehicles'))
            JOIN drivers d ON es.driver_id = d.id
            LEFT JOIN countries c ON d.country_id = c.id
            LEFT JOIN warehouses w ON d.warehouse_id = w.id
            WHERE DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= $1::date
              AND DATE((es.period_end AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= $2::date
            GROUP BY v.license_plate, manufacturer, model
            ORDER BY weighted_score DESC
        `;
        try {
            const res = await pool.query(query, [start, end]);
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
