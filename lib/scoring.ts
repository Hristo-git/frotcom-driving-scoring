
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
    harshAccelerationLow: 0.15,
    harshAccelerationHigh: 0.25,
    harshBrakingLow: 0.15,
    harshBrakingHigh: 0.25,
    harshCornering: 0.20,
    accelBrakeSwitch: 0.10,
    excessiveIdling: 0.15,
    highRPM: 0.15,
    alarms: 0.10,
    noCruiseControl: 0.10,
    accelDuringCruise: 0.10
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
    private calculateCustomScore(metrics: any, weights: ScoringWeights): number {
        // If the report already has an overall_score and weights are default, use it
        // Otherwise, re-calculate based on event counts and weights

        let score = 10.0;
        const dist = parseFloat(metrics.mileage) || 0;
        if (dist < 0.1) return 10.0; // Perfect score for no/low distance

        const distRatio = dist / 100;
        const counts = metrics.eventCounts || {};

        // Example penalty logic based on Frotcom defaults
        // (Simplified placeholder until exact formulas are confirmed)
        if (counts.lowSpeedAcceleration) score -= (counts.lowSpeedAcceleration / distRatio) * weights.harshAccelerationLow * 0.5;
        if (counts.highSpeedAcceleration) score -= (counts.highSpeedAcceleration / distRatio) * weights.harshAccelerationHigh * 0.8;
        if (counts.lowSpeedBreak) score -= (counts.lowSpeedBreak / distRatio) * weights.harshBrakingLow * 0.5;
        if (counts.highSpeedBreak) score -= (counts.highSpeedBreak / distRatio) * weights.harshBrakingHigh * 0.8;
        if (counts.lateralAcceleration) score -= (counts.lateralAcceleration / distRatio) * weights.harshCornering * 0.6;

        // Time-based metrics
        const idlePerc = parseFloat(metrics.idleTimePerc) || 0;
        if (idlePerc > 10) score -= (idlePerc - 10) * weights.excessiveIdling * 0.1;

        const rpmPerc = parseFloat(metrics.highRPMPerc) || 0;
        if (rpmPerc > 5) score -= (rpmPerc - 5) * weights.highRPM * 0.1;

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

    async getDriverPerformance(start: string, end: string, options?: { countryNames?: string[], warehouseNames?: string[], weights?: ScoringWeights }): Promise<PerformanceReport[]> {
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

        const weights = options?.weights || DEFAULT_WEIGHTS;

        try {
            const res = await pool.query(query, params);
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
                        totalWeightedScore: 0,
                        totalDistanceForWeights: 0,
                        totalDistance: 0,
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
                const isWeightable = !(score === 0 && row.metrics.hasLowMileage) && distance > 0;

                if (isWeightable) {
                    d.totalWeightedScore += score * distance;
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

            // Fetch granular events
            const eventQuery = `
                SELECT 
                    driver_id, event_type, COUNT(*) as count
                FROM ecodriving_events
                WHERE DATE((started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia')
                      >= DATE($1::timestamptz AT TIME ZONE 'Europe/Sofia')
                  AND DATE((started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia')
                      <= DATE($2::timestamptz AT TIME ZONE 'Europe/Sofia')
                GROUP BY driver_id, event_type
            `;
            const eventRes = await pool.query(eventQuery, [start, end]);

            eventRes.rows.forEach(ev => {
                const driverId = ev.driver_id;
                const d = driverMap.get(driverId);
                if (d) {
                    const type = ev.event_type;
                    const count = parseInt(ev.count);
                    d.events[type] = (d.events[type] || 0) + count;
                }
            });

            return Array.from(driverMap.values()).map(d => {
                const avgScore = d.totalDistanceForWeights > 0 ? d.totalWeightedScore / d.totalDistanceForWeights : 0;

                if (d.recommendations.size === 0 && avgScore < 8.0 && d.totalDistance > 0) {
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
                    score: parseFloat(avgScore.toFixed(2)),
                    distance: parseFloat(d.totalDistance.toFixed(1)),
                    drivingTime: Math.round(d.totalDrivingTime),
                    idling: d.totalDistanceForWeights > 0 ? parseFloat((d.totalIdlingWeighted / d.totalDistanceForWeights).toFixed(2)) : 0,
                    consumption: d.totalDistanceForWeights > 0 ? parseFloat((d.totalConsumptionWeighted / d.totalDistanceForWeights).toFixed(2)) : 0,
                    rpm: d.totalDistanceForWeights > 0 ? parseFloat((d.totalRPMWeighted / d.totalDistanceForWeights).toFixed(2)) : 0,
                    vehicles: (Array.from(d.vehicles) as string[]).sort(),
                    recommendations: (Array.from(d.recommendations) as string[]).sort(),
                    dataPoints: d.count,
                    events: d.events
                };
            }).sort((a, b) => b.score - a.score);
        } catch (error) {
            console.error('Error getting driver performance:', error);
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
            console.error('Error getting vehicle performance:', error);
            return [];
        }
    }
}
