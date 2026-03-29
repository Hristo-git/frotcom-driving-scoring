import pool from './db';
import { SCORING_SCALES } from './scoring-scales';
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

const THRESHOLD_MAPPING: Record<string, { min: number, max: number }> = {
    highRPM: { min: 0.0, max: 35.0 },
    excessiveIdling: { min: 0.0, max: 50.0 }
};

/**
 * Scoring Engine for Drivers
 */
export class ScoringEngine {
    constructor(_weights: ScoringWeights = DEFAULT_WEIGHTS) {
        // weights param kept for API compatibility; scoring uses stored Frotcom scores directly
    }

    /**
     * Calculates a category score (1.0 - 10.0) based on event density or percentage.
     * Uses official Frotcom step-wise benchmarks for Safety categories.
     */
    calculateCategoryScore(value: number, category: string): number {
        // Handle official Safety Scales
        if (category in SCORING_SCALES) {
            const scale = SCORING_SCALES[category as keyof typeof SCORING_SCALES];
            
            // If value is below or equal to the 10.0 threshold
            if (value <= scale[0]) return 10.0;
            
            // If value is above the 1.0 threshold (the last point represents score 2.0)
            if (value > scale[scale.length - 1]) return 1.0;

            // Otherwise, find the two points in the scale to interpolate between
            // scale[0] = 10.0, scale[1] = 9.0 ... scale[8] = 2.0
            for (let i = 0; i < scale.length - 1; i++) {
                if (value >= scale[i] && value <= scale[i+1]) {
                    const upperScore = 10 - i;
                    const lowerScore = 10 - (i+1);
                    const upperVal = scale[i];
                    const lowerVal = scale[i+1];
                    
                    const ratio = (value - upperVal) / (lowerVal - upperVal);
                    return upperScore - (ratio * (upperScore - lowerScore));
                }
            }
            return 1.0;
        }

        // Fallback for non-safety categories (RPM, Idling) which use linear mapping
        const mapping = THRESHOLD_MAPPING[category];
        if (!mapping) return 10.0;

        const { min, max } = mapping;
        if (value <= min) return 10.0;
        if (value >= max) return 1.0;

        return 10.0 - ((value - min) / (max - min)) * 9.0;
    }

    /**
     * Weighted Average Scoring Model
     */
    public calculateCustomScore(metrics: any, weights: ScoringWeights): number {
        const mileage = metrics.mileage || 0;
        
        if (mileage < 10 || metrics.hasLowMileage) {
            const eventCounts = metrics.eventCounts || {};
            const hasEvents = Object.values(eventCounts).some(v => (v as number) > 0);
            if (!hasEvents) return 0.00;
        }

        const distRatio = mileage / 100;
        if (distRatio <= 0) return 10.0;

        const eventCounts = metrics.eventCounts || {};
        
        const rpmPerc = metrics.highRPMPerc || 0;
        const rpmSensorAvailable = rpmPerc < 99.9;

        const catScores = {
            accelLow:  this.calculateCategoryScore((eventCounts.lowSpeedAcceleration || 0) / distRatio, 'harshAccelerationLow'),
            accelHigh: this.calculateCategoryScore((eventCounts.highSpeedAcceleration || 0) / distRatio, 'harshAccelerationHigh'),
            brakeLow:  this.calculateCategoryScore((eventCounts.lowSpeedBreak || 0) / distRatio, 'harshBrakingLow'),
            brakeHigh: this.calculateCategoryScore((eventCounts.highSpeedBreak || 0) / distRatio, 'harshBrakingHigh'),
            corner:    this.calculateCategoryScore((eventCounts.lateralAcceleration || 0) / distRatio, 'harshCornering'),
            idle:      this.calculateCategoryScore(metrics.idleTimePerc || 0, 'excessiveIdling'),
            rpm:       this.calculateCategoryScore(rpmPerc, 'highRPM')
        };

        const weightedMap = [
            { score: catScores.accelLow,  weight: weights.harshAccelerationLow },
            { score: catScores.accelHigh, weight: weights.harshAccelerationHigh },
            { score: catScores.brakeLow,  weight: weights.harshBrakingLow },
            { score: catScores.brakeHigh, weight: weights.harshBrakingHigh },
            { score: catScores.corner,    weight: weights.harshCornering },
            { score: catScores.idle,      weight: weights.excessiveIdling },
            { score: catScores.rpm,       weight: rpmSensorAvailable ? weights.highRPM : 0 }
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

    public calculateDetailedScores(metrics: any, _weights?: ScoringWeights): Record<string, number> {
        const mileage = metrics.mileage || 0;
        const distRatio = mileage / 100;
        if (distRatio <= 0) return {};

        const eventCounts = metrics.eventCounts || {};
        const rpmPerc = metrics.highRPMPerc || 0;
        const rpmSensorAvailable = rpmPerc < 99.9;

        return {
            accelLow:  this.calculateCategoryScore((eventCounts.lowSpeedAcceleration || 0) / distRatio, 'harshAccelerationLow'),
            accelHigh: this.calculateCategoryScore((eventCounts.highSpeedAcceleration || 0) / distRatio, 'harshAccelerationHigh'),
            brakeLow:  this.calculateCategoryScore((eventCounts.lowSpeedBreak || 0) / distRatio, 'harshBrakingLow'),
            brakeHigh: this.calculateCategoryScore((eventCounts.highSpeedBreak || 0) / distRatio, 'harshBrakingHigh'),
            corner:    this.calculateCategoryScore((eventCounts.lateralAcceleration || 0) / distRatio, 'harshCornering'),
            idle:      this.calculateCategoryScore(metrics.idleTimePerc || 0, 'excessiveIdling'),
            rpm:       rpmSensorAvailable ? this.calculateCategoryScore(rpmPerc, 'highRPM') : 10.0
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
              AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= $2::date
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
                        totalScoreWeighted: 0,   // Σ(frotcom_score × km)
                        vehicles: new Set<string>(),
                        recommendations: new Set<string>(),
                        events: {} as Record<string, number>,
                        count: 0
                    });
                }

                const d = driverMap.get(driverId);
                const storedScore = parseFloat(row.overall_score) || 0;
                if (distance > 0) {
                    d.totalIdlingWeighted   += idling * distance;
                    d.totalConsumptionWeighted += consumption * distance;
                    d.totalRPMWeighted      += rpm * distance;
                    d.totalScoreWeighted    += storedScore * distance;
                    d.totalDistanceForWeights += distance;
                    d.count++;
                }

                d.totalDistance    += distance;
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

                // Accumulate event counts for display/export (not used in final score calc)
                if (row.metrics.eventCounts) {
                    for (const [key, val] of Object.entries(row.metrics.eventCounts)) {
                        d.events[key] = (d.events[key] || 0) + (val as number);
                    }
                }
            });

            // Fetch granular events for display (not used in score calculation)
            const eventQuery = `
                SELECT
                    driver_id, event_type, COUNT(*) as count
                FROM ecodriving_events
                WHERE DATE((started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia')
                      BETWEEN $1::date AND $2::date
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
                // Use distance-weighted average of Frotcom's per-period scores.
                // This matches Frotcom exactly: Σ(score_i × km_i) / Σ(km_i)
                const finalScore = d.totalDistanceForWeights > 0
                    ? d.totalScoreWeighted / d.totalDistanceForWeights
                    : 0;

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
        const drivers = await this.getDriverPerformance(start, end, { warehouseNames: options?.warehouseNames });
        const countryMap = new Map<string, { name: string; totalDistance: number; totalScoreWeighted: number; driversCount: number }>();

        drivers.forEach(d => {
            if (!countryMap.has(d.country)) {
                countryMap.set(d.country, { name: d.country, totalDistance: 0, totalScoreWeighted: 0, driversCount: 0 });
            }
            const c = countryMap.get(d.country)!;
            c.totalDistance      += d.distance;
            c.totalScoreWeighted += d.score * d.distance;
            c.driversCount++;
        });

        return Array.from(countryMap.values()).map(c => ({
            name:          c.name,
            score:         parseFloat((c.totalDistance > 0 ? c.totalScoreWeighted / c.totalDistance : 0).toFixed(2)),
            driversCount:  c.driversCount,
            totalDistance: parseFloat(c.totalDistance.toFixed(2))
        })).sort((a, b) => b.score - a.score);
    }

    async getWarehousePerformance(start: string, end: string, _weights?: ScoringWeights, options?: { countryNames?: string[] }): Promise<AggregatedPerformance[]> {
        const drivers = await this.getDriverPerformance(start, end, { countryNames: options?.countryNames });
        const warehouseMap = new Map<string, { name: string; totalDistance: number; totalScoreWeighted: number; driversCount: number }>();

        drivers.forEach(d => {
            if (!warehouseMap.has(d.warehouse)) {
                warehouseMap.set(d.warehouse, { name: d.warehouse, totalDistance: 0, totalScoreWeighted: 0, driversCount: 0 });
            }
            const w = warehouseMap.get(d.warehouse)!;
            w.totalDistance      += d.distance;
            w.totalScoreWeighted += d.score * d.distance;
            w.driversCount++;
        });

        return Array.from(warehouseMap.values()).map(w => ({
            name:          w.name,
            score:         parseFloat((w.totalDistance > 0 ? w.totalScoreWeighted / w.totalDistance : 0).toFixed(2)),
            driversCount:  w.driversCount,
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
