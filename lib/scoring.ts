import pool from './db';
import { SCORING_SCALES } from './scoring-scales';
import { FrotcomClient } from './frotcom';
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
        try {
            // ── 1. Driver metadata from DB (country, warehouse, frotcom_id mapping) ──
            const metaRes = await pool.query(`
                SELECT d.id, d.frotcom_id, d.name,
                       c.name as country, w.name as warehouse,
                       c.id as country_id, w.id as warehouse_id
                FROM drivers d
                LEFT JOIN countries c ON d.country_id = c.id
                LEFT JOIN warehouses w ON d.warehouse_id = w.id
            `);

            // frotcom_id → { internalId, name, country, warehouse, ... }
            const driverMeta = new Map<string, any>();
            // internalId → same object (for event lookup)
            const driverMetaById = new Map<number, any>();
            metaRes.rows.forEach(row => {
                const meta = {
                    internalId: row.id,
                    frotcomId: row.frotcom_id?.toString(),
                    name: row.name,
                    country: row.country || 'Other',
                    warehouse: row.warehouse || 'Other',
                    countryId: row.country_id,
                    warehouseId: row.warehouse_id,
                };
                if (meta.frotcomId) driverMeta.set(meta.frotcomId, meta);
                driverMetaById.set(meta.internalId, meta);
            });

            // ── 2. Fetch scores directly from Frotcom API for the exact period ──
            const frotcomRecords = await FrotcomClient.calculateEcodriving(start, end, undefined, undefined, 'driver');

            const driverMap = new Map<number, any>();

            for (const record of frotcomRecords) {
                if (!record.driverId) continue;
                const meta = driverMeta.get(record.driverId.toString());
                if (!meta) continue;

                // Apply filters
                if (options?.driverIds && !options.driverIds.includes(meta.internalId)) continue;
                if (options?.countryNames?.length && !options.countryNames.includes(meta.country)) continue;
                if (options?.warehouseNames?.length && !options.warehouseNames.includes(meta.warehouse)) continue;

                const mileage = (record.mileageCanbus !== undefined && record.mileageCanbus !== null)
                    ? record.mileageCanbus
                    : (record.mileageGps || 0);

                if (!driverMap.has(meta.internalId)) {
                    driverMap.set(meta.internalId, {
                        internalId: meta.internalId,
                        name: meta.name,
                        country: meta.country,
                        warehouse: meta.warehouse,
                        countryId: meta.countryId,
                        warehouseId: meta.warehouseId,
                        totalDistance: 0,
                        totalDistanceForWeights: 0,
                        totalDrivingTime: 0,
                        totalIdlingWeighted: 0,
                        totalConsumptionWeighted: 0,
                        totalRPMWeighted: 0,
                        totalScoreWeighted: 0,
                        vehicles: new Set<string>(),
                        recommendations: new Set<string>(),
                        events: {} as Record<string, number>,
                        count: 0,
                    });
                }

                const d = driverMap.get(meta.internalId);
                // Use scoreCustomized — matches the Frotcom dashboard (uses configured weights)
                const scoreVal = parseFloat(record.scoreCustomized ?? record.score);

                if (mileage > 0) {
                    if (!isNaN(scoreVal))           d.totalScoreWeighted     += scoreVal * mileage;
                    const idleVal = parseFloat(record.idleTimePerc);
                    if (!isNaN(idleVal))             d.totalIdlingWeighted    += idleVal * mileage;
                    const rpmVal  = parseFloat(record.highRPMPerc);
                    if (!isNaN(rpmVal))              d.totalRPMWeighted       += rpmVal  * mileage;
                    const consVal = parseFloat(record.totalConsumption);
                    const avgCons = mileage > 0 && !isNaN(consVal) ? (consVal / mileage) * 100 : 0;
                    d.totalConsumptionWeighted += avgCons * mileage;
                    d.totalDistanceForWeights  += mileage;
                    d.count++;
                }

                d.totalDistance    += mileage;
                d.totalDrivingTime += (record.drivingTime || 0);

                if (record.licensePlate) d.vehicles.add(record.licensePlate);
                if (Array.isArray(record.vehicles)) record.vehicles.forEach((p: string) => d.vehicles.add(p));

                (record.recommendations || []).forEach((id: number) => {
                    const label = RECOMMENDATION_LABELS[id];
                    if (label) d.recommendations.add(label);
                });
            }

            // ── 3. Fetch granular events for display ──
            const eventRes = await pool.query(`
                SELECT driver_id, event_type, COUNT(*) as count
                FROM ecodriving_events
                WHERE DATE((started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia')
                      BETWEEN $1::date AND $2::date
                GROUP BY driver_id, event_type
            `, [start, end]);

            eventRes.rows.forEach((ev: any) => {
                const d = driverMap.get(ev.driver_id);
                if (d) d.events[ev.event_type] = parseInt(ev.count);
            });

            return Array.from(driverMap.values()).map(d => ({
                driverId:      d.internalId,
                driverName:    d.name,
                country:       d.country,
                warehouse:     d.warehouse,
                countryId:     d.countryId,
                warehouseId:   d.warehouseId,
                score:         parseFloat((d.totalDistanceForWeights > 0 ? d.totalScoreWeighted / d.totalDistanceForWeights : 0).toFixed(2)),
                distance:      parseFloat(d.totalDistance.toFixed(1)),
                drivingTime:   Math.round(d.totalDrivingTime),
                idling:        d.totalDistanceForWeights > 0 ? parseFloat((d.totalIdlingWeighted / d.totalDistanceForWeights).toFixed(2)) : 0,
                consumption:   d.totalDistanceForWeights > 0 ? parseFloat((d.totalConsumptionWeighted / d.totalDistanceForWeights).toFixed(2)) : 0,
                rpm:           d.totalDistanceForWeights > 0 ? parseFloat((d.totalRPMWeighted / d.totalDistanceForWeights).toFixed(2)) : 0,
                vehicles:      Array.from(d.vehicles) as string[],
                recommendations: Array.from(d.recommendations) as string[],
                dataPoints:    d.count,
                events:        d.events,
            })).sort((a, b) => b.score - a.score);

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
