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

const THRESHOLD_MAPPING: Record<string, number[]> = {
    harshAccelerationLow: [0.08, 0.35, 0.80, 1.30, 2.00, 2.85, 3.85, 5.50, 9.00],
    harshAccelerationHigh: [0.03, 0.08, 0.20, 0.28, 0.45, 0.65, 1.15, 1.60, 2.65],
    harshBrakingLow: [0.30, 0.80, 1.35, 1.75, 2.30, 3.00, 3.90, 4.90, 7.50],
    harshBrakingHigh: [0.05, 0.10, 0.19, 0.30, 0.42, 0.56, 0.83, 1.21, 1.90],
    harshCornering: [0.25, 1.20, 3.85, 7.70, 13.70, 19.70, 23.50, 35.20, 45.00],
    highRPM: [0.0, 1.0, 2.0, 3.5, 5.0, 7.5, 12.0, 20.0, 35.0],
    excessiveIdling: [0.0, 2.0, 4.0, 7.0, 11.0, 16.0, 22.0, 35.0, 50.0]
};

export class ScoringEngine {
    private currentWeights: ScoringWeights = DEFAULT_WEIGHTS;

    constructor(customWeights?: ScoringWeights) {
        if (customWeights) {
            this.currentWeights = { ...DEFAULT_WEIGHTS, ...customWeights };
        }
    }

    /**
     * Maps a count/100km value to a 1.0-10.0 score using linear interpolation
     */
    private calculateCategoryScore(val: number, category: string): number {
        const thresholds = THRESHOLD_MAPPING[category];
        if (!thresholds) return 10.0;

        const value = Math.max(0, val);
        
        if (value <= thresholds[0]) return 10.0;
        if (value > thresholds[thresholds.length - 1]) return 1.0;

        // Linear interpolation between brackets (10 to 2)
        // Thresholds[0] is for score 10
        // Thresholds[8] is for score 2
        for (let i = 0; i < thresholds.length - 1; i++) {
            if (value <= thresholds[i + 1]) {
                const range = thresholds[i + 1] - thresholds[i];
                const diff = value - thresholds[i];
                const score = (10 - i) - (diff / range);
                return Math.max(1, score);
            }
        }

        return 1.0;
    }

    /**
     * Weighted Average Scoring Model
     * 1. Convert events per 100km to 1-10 category scores
     * 2. Apply weights from DEFAULT_WEIGHTS (sliders)
     * 3. Return weighted average
     */
    public calculateCustomScore(metrics: any, weights: ScoringWeights): number {
        const mileage = metrics.mileage || 0;
        
        // Frotcom Parity: Trips with very low mileage or marked as low-quality often have 0.00 score
        if (mileage < 10 || metrics.hasLowMileage) {
            // Check if there are any harsh events even on low mileage
            const eventCounts = metrics.eventCounts || {};
            const hasEvents = Object.values(eventCounts).some(v => (v as number) > 0);
            if (!hasEvents) return 0.00;
        }

        const distRatio = mileage / 100;
        
        if (distRatio <= 0) return 10.0;

        const eventCounts = metrics.eventCounts || {};
        
        const catScores = {
            accelLow: this.calculateCategoryScore((eventCounts.lowSpeedAcceleration || 0) / distRatio, 'harshAccelerationLow'),
            accelHigh: this.calculateCategoryScore((eventCounts.highSpeedAcceleration || 0) / distRatio, 'harshAccelerationHigh'),
            brakeLow: this.calculateCategoryScore((eventCounts.lowSpeedBreak || 0) / distRatio, 'harshBrakingLow'),
            brakeHigh: this.calculateCategoryScore(((eventCounts.highSpeedBreak || 0) + (eventCounts.accelBrakeFastShift || 0)) / distRatio, 'harshBrakingHigh'),
            corner: this.calculateCategoryScore((eventCounts.lateralAcceleration || 0) / distRatio, 'harshCornering'),
            idle: this.calculateCategoryScore(metrics.idleTimePerc || 0, 'excessiveIdling'),
            rpm: this.calculateCategoryScore(metrics.highRPMPerc || 0, 'highRPM')
        };

        const weightedMap = [
            { score: catScores.accelLow, weight: weights.harshAccelerationLow },
            { score: catScores.accelHigh, weight: weights.harshAccelerationHigh },
            { score: catScores.brakeLow, weight: weights.harshBrakingLow },
            { score: catScores.brakeHigh, weight: weights.harshBrakingHigh },
            { score: catScores.corner, weight: weights.harshCornering },
            { score: catScores.idle, weight: weights.excessiveIdling },
            { score: catScores.rpm, weight: weights.highRPM }
        ];

        let totalWeightedScore = 0;
        let totalWeight = 0;

        weightedMap.forEach(item => {
            if (item.weight > 0) {
                totalWeightedScore += item.score * item.weight;
                totalWeight += item.weight;
            }
        });

        if (totalWeight === 0) return 10.0;
        
        const finalScore = totalWeightedScore / totalWeight;
        return Math.min(10, Math.max(1, finalScore));
    }

    public calculateDetailedScores(metrics: any, weights: ScoringWeights): Record<string, number> {
        const mileage = metrics.mileage || 0;
        const distRatio = mileage / 100;
        
        if (distRatio <= 0) return {};

        const eventCounts = metrics.eventCounts || {};
        
        return {
            accelLow: this.calculateCategoryScore((eventCounts.lowSpeedAcceleration || 0) / distRatio, 'harshAccelerationLow'),
            accelHigh: this.calculateCategoryScore((eventCounts.highSpeedAcceleration || 0) / distRatio, 'harshAccelerationHigh'),
            brakeLow: this.calculateCategoryScore((eventCounts.lowSpeedBreak || 0) / distRatio, 'harshBrakingLow'),
            brakeHigh: this.calculateCategoryScore(((eventCounts.highSpeedBreak || 0) + (eventCounts.accelBrakeFastShift || 0)) / distRatio, 'harshBrakingHigh'),
            corner: this.calculateCategoryScore((eventCounts.lateralAcceleration || 0) / distRatio, 'harshCornering'),
            idle: this.calculateCategoryScore(metrics.idleTimePerc || 0, 'excessiveIdling'),
            rpm: this.calculateCategoryScore(metrics.highRPMPerc || 0, 'highRPM')
        };
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

                const finalScore = this.calculateCustomScore(aggregatedMetrics, weights);

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
            const score = this.calculateCustomScore(aggregatedMetrics, weights);
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
            const score = this.calculateCustomScore(aggregatedMetrics, activeWeights);
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
