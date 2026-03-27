
import pool from './db';
export interface ScoringWeights {
    harshAccelerationLow: number;
    harshAccelerationHigh: number;
    harshBrakingLow: number;
    harshBrakingHigh: number;
    harshCornering: number;
    accelBrakeSwitch: number;
    excessiveIdling: number;    // Weight for idling %
    highRPM: number;            // Weight for high RPM %
    alarms: number;
    noCruiseControl: number;    // Weight for % time without CC
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
    harshAccelerationLow: 0.60,      // Slider 1
    harshAccelerationHigh: 0.60,     // Slider 2
    harshBrakingLow: 0.75,           // Slider 3
    harshBrakingHigh: 0.75,          // Slider 4
    harshCornering: 0.90,            // Slider 5
    accelBrakeSwitch: 0.00,          // Slider 6
    excessiveIdling: 0.00,           // Slider 7 (Disabled as per user request)
    highRPM: 0.00,                   // Slider 8
    alarms: 0.00,                    // Slider 9
    noCruiseControl: 0.05,           // Slider 10
    accelDuringCruise: 0.00          // Slider 11
};

/**
 * Scoring Profiles ("Skills")
 * These can be invoked to apply different calibration sets.
 */
export const SCORING_PROFILES: Record<string, ScoringWeights> = {
    frotcom_personalized: { ...DEFAULT_WEIGHTS },
    safety_focused: {
        ...DEFAULT_WEIGHTS,
        harshCornering: 1.5,
        alarms: 1.0
    },
    eco_economy: {
        ...DEFAULT_WEIGHTS,
        excessiveIdling: 1.5,
        accelDuringCruise: 0.1
    }
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

const CATEGORY_THRESHOLDS = {
    harshAccelerationLow: [
        { max: 0.08, score: 10 }, { max: 0.35, score: 9 }, { max: 0.80, score: 8 },
        { max: 1.30, score: 7 }, { max: 2.00, score: 6 }, { max: 2.85, score: 5 },
        { max: 3.85, score: 4 }, { max: 5.50, score: 3 }, { max: 9.00, score: 2 }
    ],
    harshAccelerationHigh: [
        { max: 0.03, score: 10 }, { max: 0.08, score: 9 }, { max: 0.20, score: 8 },
        { max: 0.28, score: 7 }, { max: 0.45, score: 6 }, { max: 0.65, score: 5 },
        { max: 1.15, score: 4 }, { max: 1.60, score: 3 }, { max: 2.65, score: 2 }
    ],
    harshBrakingLow: [
        { max: 0.30, score: 10 }, { max: 0.80, score: 9 }, { max: 1.35, score: 8 },
        { max: 1.75, score: 7 }, { max: 2.30, score: 6 }, { max: 3.00, score: 5 },
        { max: 3.90, score: 4 }, { max: 4.90, score: 3 }, { max: 7.50, score: 2 }
    ],
    harshBrakingHigh: [
        { max: 0.05, score: 10 }, { max: 0.10, score: 9 }, { max: 0.19, score: 8 },
        { max: 0.30, score: 7 }, { max: 0.42, score: 6 }, { max: 0.56, score: 5 },
        { max: 0.83, score: 4 }, { max: 1.21, score: 3 }, { max: 1.90, score: 2 }
    ],
    harshCornering: [
        { max: 0.25, score: 10 }, { max: 1.20, score: 9 }, { max: 3.85, score: 8 },
        { max: 7.70, score: 7 }, { max: 13.70, score: 6 }, { max: 19.70, score: 5 },
        { max: 23.50, score: 4 }, { max: 35.20, score: 3 }, { max: 45.00, score: 2 }
    ]
};

function getScoreFromTable(eventsPer100km: number, category: keyof typeof CATEGORY_THRESHOLDS): number {
    const thresholds = CATEGORY_THRESHOLDS[category];
    for (const t of thresholds) {
        if (eventsPer100km <= t.max) return t.score;
    }
    return 1;
}

export class ScoringEngine {
    private currentWeights: ScoringWeights = DEFAULT_WEIGHTS;

    public setProfile(name: string): void {
        const profile = SCORING_PROFILES[name];
        if (profile) {
            this.currentWeights = { ...profile };
            console.log(`Scoring profile set to: ${name}`);
        } else {
            console.warn(`Profile ${name} not found. Keeping current weights.`);
        }
    }

    public getProfile(): ScoringWeights {
        return { ...this.currentWeights };
    }

    private calculateCustomScore(metrics: any, weights: ScoringWeights, avgSpeed: number): number {
        const dist = parseFloat(metrics.mileage) || 0;
        if (dist < 0.1) return 10.0;

        const distRatio = dist / 100;
        const counts = metrics.eventCounts || {};

        let totalWeight = 0;
        let weightedScoreSum = 0;

        const addScore = (weight: number, scoreValue: number) => {
            if (weight > 0) {
                totalWeight += weight;
                weightedScoreSum += (scoreValue * weight);
            }
        };

        const evLowAccel = (counts.lowSpeedAcceleration || 0) / distRatio;
        addScore(weights.harshAccelerationLow, getScoreFromTable(evLowAccel, 'harshAccelerationLow'));

        const evHighAccel = (counts.highSpeedAcceleration || 0) / distRatio;
        addScore(weights.harshAccelerationHigh, getScoreFromTable(evHighAccel, 'harshAccelerationHigh'));

        const evLowBrake = (counts.lowSpeedBreak || 0) / distRatio;
        addScore(weights.harshBrakingLow, getScoreFromTable(evLowBrake, 'harshBrakingLow'));

        const evHighBrake = (counts.highSpeedBreak || 0) / distRatio;
        addScore(weights.harshBrakingHigh, getScoreFromTable(evHighBrake, 'harshBrakingHigh'));

        const evCornering = (counts.lateralAcceleration || 0) / distRatio;
        addScore(weights.harshCornering, getScoreFromTable(evCornering, 'harshCornering'));

        // Linear fallback for events without specific thresholds mapped
        const scoreLinearFallback = (countPer100: number, severity: number = 1) => {
            const raw = 10 - (countPer100 * severity);
            return Math.max(1, Math.min(10, raw));
        };

        addScore(weights.accelBrakeSwitch, scoreLinearFallback((counts.accelBrakeFastShift || 0) / distRatio, 0.5));
        addScore(weights.accelDuringCruise, scoreLinearFallback((counts.accWithCCActive || 0) / distRatio, 0.5));
        addScore(weights.noCruiseControl, scoreLinearFallback((counts.noCruise || 0) / distRatio, 0.1));
        
        const idlePerc = Math.abs(parseFloat(metrics.idleTimePerc) || 0);
        addScore(weights.excessiveIdling, scoreLinearFallback(idlePerc, 0.5)); 

        const rpmPerc = Math.abs(parseFloat(metrics.highRPMPerc) || 0);
        addScore(weights.highRPM, scoreLinearFallback(rpmPerc, 1.0));

        if (totalWeight === 0) return 10.0;
        
        const finalScore = weightedScoreSum / totalWeight;
        return Math.max(1, Math.min(10, finalScore));
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
