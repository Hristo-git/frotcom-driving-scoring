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
        // ── DB-first: use cached period-summary rows (exact Frotcom scores stored by cron).
        //    Only call live API if no period-summary exists for the requested range.
        const dbResult = await this._getDriverPerformanceFromDB(start, end, options);
        if (dbResult.length > 0) {
            return dbResult;
        }
        // No cached data — try live Frotcom API
        console.log('[getDriverPerformance] No period-summary in DB, trying live API...');
        try {
            return await this._getDriverPerformanceFromAPI(start, end, options);
        } catch (apiError) {
            console.error('[getDriverPerformance] Live API also failed, falling back to daily aggregation:', apiError);
            return this._getDriverPerformanceFromDailyDB(start, end, options);
        }
    }

    private async _getDriverPerformanceFromAPI(start: string, end: string, options?: { countryNames?: string[], warehouseNames?: string[], weights?: ScoringWeights, driverIds?: number[] }): Promise<PerformanceReport[]> {
        // ── 1. Driver metadata from DB ──
        const metaRes = await pool.query(`
            SELECT d.id, d.frotcom_id, d.name,
                   c.name as country, w.name as warehouse,
                   c.id as country_id, w.id as warehouse_id
            FROM drivers d
            LEFT JOIN countries c ON d.country_id = c.id
            LEFT JOIN warehouses w ON d.warehouse_id = w.id
        `);

        const driverMeta = new Map<string, any>();
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
        });

        // ── 2. Fetch scores from Frotcom API for the exact period ──
        const frotcomRecords = await FrotcomClient.calculateEcodriving(start, end, undefined, undefined, 'driver');
        if (!frotcomRecords.length) throw new Error('Frotcom API returned 0 records');

        const driverMap = new Map<number, any>();

        for (const record of frotcomRecords) {
            if (!record.driverId) continue;
            const meta = driverMeta.get(record.driverId.toString());
            if (!meta) continue;

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
            const scoreVal = parseFloat(record.scoreCustomized ?? record.score);

            if (mileage > 0) {
                if (!isNaN(scoreVal))  d.totalScoreWeighted       += scoreVal * mileage;
                const idleVal = parseFloat(record.idleTimePerc);
                if (!isNaN(idleVal))   d.totalIdlingWeighted       += idleVal * mileage;
                const rpmVal  = parseFloat(record.highRPMPerc);
                if (!isNaN(rpmVal))    d.totalRPMWeighted          += rpmVal  * mileage;
                const consVal = parseFloat(record.totalConsumption);
                const avgCons = !isNaN(consVal) ? (consVal / mileage) * 100 : 0;
                d.totalConsumptionWeighted += avgCons * mileage;
                d.totalDistanceForWeights  += mileage;
                d.count++;
            }
            d.totalDistance    += mileage;
            d.totalDrivingTime += (record.drivingTime || 0);
            if (record.license_plate) d.vehicles.add(record.license_plate.replace(/-[БЦбц]$/, ""));
            if (Array.isArray(record.vehicles)) record.vehicles.forEach((p: string) => d.vehicles.add(p.replace(/-[БЦбц]$/, "")));
            (record.recommendations || []).forEach((id: number) => {
                const label = RECOMMENDATION_LABELS[id];
                if (label) d.recommendations.add(label);
            });
        }

        // ── 3. Granular events for display ──
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
            driverId:        d.internalId,
            driverName:      d.name,
            country:         d.country,
            warehouse:       d.warehouse,
            countryId:       d.countryId,
            warehouseId:     d.warehouseId,
            score:           parseFloat((d.totalDistanceForWeights > 0 ? d.totalScoreWeighted / d.totalDistanceForWeights : 0).toFixed(2)),
            distance:        parseFloat(d.totalDistance.toFixed(1)),
            drivingTime:     Math.round(d.totalDrivingTime),
            idling:          d.totalDistanceForWeights > 0 ? parseFloat((d.totalIdlingWeighted / d.totalDistanceForWeights).toFixed(2)) : 0,
            consumption:     d.totalDistanceForWeights > 0 ? parseFloat((d.totalConsumptionWeighted / d.totalDistanceForWeights).toFixed(2)) : 0,
            rpm:             d.totalDistanceForWeights > 0 ? parseFloat((d.totalRPMWeighted / d.totalDistanceForWeights).toFixed(2)) : 0,
            vehicles:        Array.from(d.vehicles) as string[],
            recommendations: Array.from(d.recommendations) as string[],
            dataPoints:      d.count,
            events:          d.events,
        })).sort((a, b) => b.score - a.score);
    }

    private async _getDriverPerformanceFromDB(start: string, end: string, options?: { countryNames?: string[], warehouseNames?: string[], weights?: ScoringWeights, driverIds?: number[] }): Promise<PerformanceReport[]> {
        // Prefer period-summary rows written by fetchAndStorePeriodScores (isPeriodSummary=true).
        // These are exact Frotcom period scores cached by the cron job.
        // Fall back to aggregating daily rows only when no period-summary exists.
        // Match period-summary rows by date only (not exact timestamp).
        // The column stores e.g. '2026-03-01 00:00:00' literally; ::date extracts '2026-03-01'.
        const startDate = start.substring(0, 10);
        const endDate   = end.substring(0, 10);

        let query = `
            SELECT
                d.id as driver_id, d.name, c.name as country, w.name as warehouse,
                c.id as country_id, w.id as warehouse_id,
                es.overall_score, es.metrics
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            LEFT JOIN countries c ON d.country_id = c.id
            LEFT JOIN warehouses w ON d.warehouse_id = w.id
            WHERE es.period_start::date = $1::date
              AND es.period_end::date = $2::date
              AND (es.metrics->>'isPeriodSummary')::boolean = true
        `;
        const params: any[] = [startDate, endDate];
        let paramIdx = 3;
        if (options?.countryNames?.length)   { query += ` AND c.name = ANY($${paramIdx}::text[])`; params.push(options.countryNames);   paramIdx++; }
        if (options?.warehouseNames?.length)  { query += ` AND w.name = ANY($${paramIdx}::text[])`; params.push(options.warehouseNames);  paramIdx++; }
        if (options?.driverIds?.length)       { query += ` AND d.id = ANY($${paramIdx}::int[])`;    params.push(options.driverIds);        paramIdx++; }

        const res = await pool.query(query, params);

        // If no cached period summaries yet, fall back to daily aggregation
        if (res.rows.length === 0) {
            return this._getDriverPerformanceFromDailyDB(start, end, options);
        }

        const eventRes = await pool.query(`
            SELECT driver_id, event_type, COUNT(*) as count
            FROM ecodriving_events
            WHERE DATE((started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') BETWEEN $1::date AND $2::date
            GROUP BY driver_id, event_type
        `, [start, end]);
        const evByDriver = new Map<number, Record<string, number>>();
        eventRes.rows.forEach((ev: any) => {
            if (!evByDriver.has(ev.driver_id)) evByDriver.set(ev.driver_id, {});
            evByDriver.get(ev.driver_id)![ev.event_type] = parseInt(ev.count);
        });

        return res.rows.map(row => ({
            driverId:        row.driver_id,
            driverName:      row.name,
            country:         row.country || 'Other',
            warehouse:       row.warehouse || 'Other',
            countryId:       row.country_id,
            warehouseId:     row.warehouse_id,
            score:           parseFloat(parseFloat(row.overall_score).toFixed(2)),
            distance:        parseFloat((parseFloat(row.metrics.mileage) || 0).toFixed(1)),
            drivingTime:     Math.round(parseFloat(row.metrics.drivingTime) || 0),
            idling:          parseFloat((parseFloat(row.metrics.idleTimePerc) || 0).toFixed(2)),
            consumption:     parseFloat((parseFloat(row.metrics.averageConsumption) || 0).toFixed(2)),
            rpm:             parseFloat((parseFloat(row.metrics.highRPMPerc) || 0).toFixed(2)),
            vehicles:        Array.isArray(row.metrics.vehicles) ? (row.metrics.vehicles as string[]).map(p => p.replace(/-[БЦбц]$/, "")) : [],
            recommendations: Array.isArray(row.metrics.failingCriteria) ? row.metrics.failingCriteria : [],
            dataPoints:      1,
            events:          evByDriver.get(row.driver_id) || {},
        })).sort((a, b) => b.score - a.score);
    }

    private async _getDriverPerformanceFromDailyDB(start: string, end: string, options?: { countryNames?: string[], warehouseNames?: string[], weights?: ScoringWeights, driverIds?: number[] }): Promise<PerformanceReport[]> {
        let query = `
            SELECT
                d.id as driver_id, d.name, c.name as country, w.name as warehouse,
                c.id as country_id, w.id as warehouse_id,
                es.overall_score, es.metrics
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            LEFT JOIN countries c ON d.country_id = c.id
            LEFT JOIN warehouses w ON d.warehouse_id = w.id
            WHERE DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= $1::date
              AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= $2::date
              AND (es.metrics->>'isPeriodSummary') IS NULL
              AND jsonb_typeof(es.metrics->'vehicles') = 'array'
              AND jsonb_array_length(es.metrics->'vehicles') > 0
        `;
        const params: any[] = [start, end];
        let paramIdx = 3;
        if (options?.countryNames?.length)   { query += ` AND c.name = ANY($${paramIdx}::text[])`; params.push(options.countryNames);   paramIdx++; }
        if (options?.warehouseNames?.length)  { query += ` AND w.name = ANY($${paramIdx}::text[])`; params.push(options.warehouseNames);  paramIdx++; }
        if (options?.driverIds?.length)       { query += ` AND d.id = ANY($${paramIdx}::int[])`;    params.push(options.driverIds);        paramIdx++; }

        const res = await pool.query(query, params);
        const driverMap = new Map<number, any>();

        res.rows.forEach(row => {
            const driverId    = row.driver_id;
            const distance    = parseFloat(row.metrics.mileage) || 0;
            const storedScore = parseFloat(row.overall_score) || 0;
            const rowVehicles: string[] = Array.isArray(row.metrics.vehicles) ? row.metrics.vehicles : [];

            if (!driverMap.has(driverId)) {
                driverMap.set(driverId, {
                    driver_id: driverId, name: row.name,
                    country: row.country, warehouse: row.warehouse,
                    country_id: row.country_id, warehouse_id: row.warehouse_id,
                    totalDistance: 0, totalDistanceForWeights: 0,
                    totalDrivingTime: 0, totalIdlingWeighted: 0,
                    totalConsumptionWeighted: 0, totalRPMWeighted: 0,
                    totalScoreWeighted: 0,
                    vehicles: new Set<string>(), recommendations: new Set<string>(),
                    events: {} as Record<string, number>, count: 0,
                });
            }
            const d = driverMap.get(driverId);
            if (distance > 0) {
                d.totalScoreWeighted       += storedScore * distance;
                d.totalIdlingWeighted      += (parseFloat(row.metrics.idleTimePerc) || 0)       * distance;
                d.totalConsumptionWeighted += (parseFloat(row.metrics.averageConsumption) || 0) * distance;
                d.totalRPMWeighted         += (parseFloat(row.metrics.highRPMPerc) || 0)        * distance;
                d.totalDistanceForWeights  += distance;
                d.count++;
            }
            d.totalDistance    += distance;
            d.totalDrivingTime += parseFloat(row.metrics.drivingTime) || 0;
            rowVehicles.forEach((p: string) => d.vehicles.add(p.replace(/-[БЦбц]$/, "")));
            if (Array.isArray(row.metrics.failingCriteria))
                row.metrics.failingCriteria.forEach((c: string) => d.recommendations.add(c));
        });

        const eventRes = await pool.query(`
            SELECT driver_id, event_type, COUNT(*) as count
            FROM ecodriving_events
            WHERE DATE((started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') BETWEEN $1::date AND $2::date
            GROUP BY driver_id, event_type
        `, [start, end]);
        eventRes.rows.forEach((ev: any) => {
            const d = driverMap.get(ev.driver_id);
            if (d) d.events[ev.event_type] = parseInt(ev.count);
        });

        return Array.from(driverMap.values()).map(d => ({
            driverId:        d.driver_id,
            driverName:      d.name,
            country:         d.country || 'Other',
            warehouse:       d.warehouse || 'Other',
            countryId:       d.country_id,
            warehouseId:     d.warehouse_id,
            score:           parseFloat((d.totalDistanceForWeights > 0 ? d.totalScoreWeighted / d.totalDistanceForWeights : 0).toFixed(2)),
            distance:        parseFloat(d.totalDistance.toFixed(1)),
            drivingTime:     Math.round(d.totalDrivingTime),
            idling:          d.totalDistanceForWeights > 0 ? parseFloat((d.totalIdlingWeighted / d.totalDistanceForWeights).toFixed(2)) : 0,
            consumption:     d.totalDistanceForWeights > 0 ? parseFloat((d.totalConsumptionWeighted / d.totalDistanceForWeights).toFixed(2)) : 0,
            rpm:             d.totalDistanceForWeights > 0 ? parseFloat((d.totalRPMWeighted / d.totalDistanceForWeights).toFixed(2)) : 0,
            vehicles:        Array.from(d.vehicles) as string[],
            recommendations: Array.from(d.recommendations) as string[],
            dataPoints:      d.count,
            events:          d.events,
        })).sort((a, b) => b.score - a.score);
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
        // Use daily rows (isPeriodSummary IS NULL) which contain vehicle plate arrays
        // populated during the daily cron sync. Period-summary rows do not include plates
        // because the Frotcom driver-level API does not return them.
        let query = `
            SELECT
                sub.plate,
                v.metadata->>'manufacturer' AS manufacturer,
                v.metadata->>'model' AS model,
                v.metadata->>'className' AS vehicle_class,
                SUM(sub.driver_mileage) AS total_distance,
                SUM(sub.weighted_score) AS weighted_score,
                SUM(sub.weighted_consumption) AS weighted_consumption
            FROM (
                SELECT
                    REGEXP_REPLACE(jsonb_array_elements_text(es.metrics->'vehicles'), '-[БЦбц]$', '') AS plate,
                    CAST(es.metrics->>'mileage' AS NUMERIC)
                        / GREATEST(jsonb_array_length(es.metrics->'vehicles'), 1) AS driver_mileage,
                    es.overall_score * CAST(es.metrics->>'mileage' AS NUMERIC)
                        / GREATEST(jsonb_array_length(es.metrics->'vehicles'), 1) AS weighted_score,
                    COALESCE(CAST(NULLIF(es.metrics->>'averageConsumption', 'null') AS NUMERIC), 0)
                        * CAST(es.metrics->>'mileage' AS NUMERIC)
                        / GREATEST(jsonb_array_length(es.metrics->'vehicles'), 1) AS weighted_consumption,
                    c.name AS country_name,
                    w.name AS warehouse_name
                FROM ecodriving_scores es
                JOIN drivers d ON es.driver_id = d.id
                LEFT JOIN countries c ON d.country_id = c.id
                LEFT JOIN warehouses w ON d.warehouse_id = w.id
                WHERE DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= $1::date
                  AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= $2::date
                  AND (es.metrics->>'isPeriodSummary') IS NULL
                  AND CAST(es.metrics->>'mileage' AS NUMERIC) > 0
                  AND jsonb_typeof(es.metrics->'vehicles') = 'array'
                  AND jsonb_array_length(es.metrics->'vehicles') > 0
            ) sub
            -- Match plate directly OR by stripping the trailing suffix (-Б, -Ц, etc.)
            -- The vehicles table stores plates with suffix; ecodriving data may omit it
            LEFT JOIN vehicles v ON v.license_plate = sub.plate
                OR v.license_plate = sub.plate || '-Б'
                OR v.license_plate = sub.plate || '-Ц'
                OR v.license_plate = sub.plate || '-б'
                OR v.license_plate = sub.plate || '-ц'
        `;
        const params: any[] = [start.substring(0, 10), end.substring(0, 10)];
        let paramIdx = 3;
        if (options?.countryNames?.length)  { query += ` WHERE sub.country_name = ANY($${paramIdx}::text[])`; params.push(options.countryNames); paramIdx++; }
        if (options?.warehouseNames?.length) {
            query += options?.countryNames?.length ? ` AND` : ` WHERE`;
            query += ` sub.warehouse_name = ANY($${paramIdx}::text[])`;
            params.push(options.warehouseNames); paramIdx++;
        }
        query += ` GROUP BY sub.plate, manufacturer, model, vehicle_class ORDER BY total_distance DESC`;

        try {
            const res = await pool.query(query, params);
            return res.rows.map(row => ({
                licensePlate: row.plate,
                manufacturer: row.manufacturer || 'Unknown',
                model: row.model || 'Unknown',
                vehicleClass: row.vehicle_class || '',
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
