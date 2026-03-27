
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

function calculateCustomScore(metrics: any) {
    const dist = parseFloat(metrics.mileage) || 0;
    if (dist < 0.1) return 10.0;

    let score = 10.0;
    const distRatio = dist / 100;
    const counts = metrics.eventCounts || {};

    // Standard weights (Frotcom default)
    const weights = {
        harshAccelerationLow: 90.0,
        harshAccelerationHigh: 75.0,
        harshBrakingLow: 65.0,
        harshBrakingHigh: 75.0,
        harshCornering: 70.0,
        excessiveIdling: 20.0,
        highRPM: 0.15,
    };
    
    const sumWeights = Object.values(weights).reduce((a, b) => a + b, 0);
    const nf = (w: number) => w / sumWeights;
    const K = 0.015;

    if (counts.lowSpeedAcceleration) score -= (counts.lowSpeedAcceleration / distRatio) * nf(weights.harshAccelerationLow) * K * 10;
    if (counts.highSpeedAcceleration) score -= (counts.highSpeedAcceleration / distRatio) * nf(weights.harshAccelerationHigh) * K * 15;
    if (counts.lowSpeedBreak) score -= (counts.lowSpeedBreak / distRatio) * nf(weights.harshBrakingLow) * K * 10;
    if (counts.highSpeedBreak) score -= (counts.highSpeedBreak / distRatio) * nf(weights.harshBrakingHigh) * K * 15;
    if (counts.lateralAcceleration) score -= (counts.lateralAcceleration / distRatio) * nf(weights.harshCornering) * K * 12;

    const idlePerc = Math.abs(parseFloat(metrics.idleTimePerc) || 0);
    if (idlePerc > 10) score -= (idlePerc - 10) * nf(weights.excessiveIdling) * 0.5;

    const rpmPerc = Math.abs(parseFloat(metrics.highRPMPerc) || 0);
    if (rpmPerc > 5) score -= (rpmPerc - 5) * nf(weights.highRPM) * 0.2;

    return Math.max(0, Math.min(10, score));
}

async function verifyIvan() {
    const res = await pool.query("SELECT name, frotcom_id, id FROM drivers WHERE name ILIKE '%Иван Илиев%'");
    if (res.rows.length === 0) return;
    const ivanId = res.rows[0].id;
    const fId = res.rows[0].frotcom_id;

    console.log(`Investigating Ivan (Internal ID: ${ivanId}, Frotcom ID: ${fId})`);

    // 1. Get all daily scores for aggregate
    const daysRes = await pool.query(`
        SELECT period_start, metrics, overall_score
        FROM ecodriving_scores
        WHERE driver_id = $1 AND period_start >= '2026-03-01' AND period_start < '2026-03-16'
    `, [ivanId]);

    // 2. Get all granular events
    const eventsRes = await pool.query(`
        SELECT event_type, COUNT(*) as count
        FROM ecodriving_events
        WHERE driver_id = $1 AND started_at >= '2026-03-01' AND started_at < '2026-03-16'
        GROUP BY event_type
    `, [ivanId]);

    const aggregatedEvents: any = {};
    eventsRes.rows.forEach(r => aggregatedEvents[r.event_type] = parseInt(r.count));

    let totalDist = 0;
    let totalIdleWeighted = 0;
    let totalRPMWeighted = 0;
    let totalDistForWeights = 0;

    daysRes.rows.forEach(row => {
        const m = row.metrics;
        const d = parseFloat(m.mileage) || 0;
        totalDist += d;
        if (d > 0) {
            totalIdleWeighted += (parseFloat(m.idleTimePerc) || 0) * d;
            totalRPMWeighted += (parseFloat(m.highRPMPerc) || 0) * d;
            totalDistForWeights += d;
        }
    });

    const finalMetrics = {
        mileage: totalDist,
        idleTimePerc: totalDistForWeights > 0 ? totalIdleWeighted / totalDistForWeights : 0,
        highRPMPerc: totalDistForWeights > 0 ? totalRPMWeighted / totalDistForWeights : 0,
        eventCounts: aggregatedEvents
    };

    console.log("\nAggregated Metrics for March 1-15:");
    console.log(JSON.stringify(finalMetrics, null, 2));

    const finalScore = calculateCustomScore(finalMetrics);
    console.log("\nCalculated Aggregate Score:", finalScore.toFixed(2));
    console.log("Frotcom Dashboard Score: 5.6");
    console.log("Difference:", Math.abs(finalScore - 5.6).toFixed(2));
    
    if (Object.keys(aggregatedEvents).length === 0) {
        console.log("\n⚠️ WARNING: NO EVENTS FOUND IN ecodriving_events FOR THIS PERIOD!");
    }
}

verifyIvan().then(() => pool.end()).catch(console.error);
