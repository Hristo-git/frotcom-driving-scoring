
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const DEFAULT_WEIGHTS = {
    harshAccelerationLow: 90.0,
    harshAccelerationHigh: 75.0,
    harshBrakingLow: 65.0,
    harshBrakingHigh: 75.0,
    harshCornering: 70.0,
    accelBrakeSwitch: 0.1,
    excessiveIdling: 20.0,
    highRPM: 0.15,
    alarms: 0.1,
    noCruiseControl: 0.1,
    accelDuringCruise: 0.1
};

function calculateCustomScore(metrics: any) {
    const dist = parseFloat(metrics.mileage) || 0;
    if (dist < 0.1) return 10.0;

    const weights = DEFAULT_WEIGHTS;
    const sumWeights = Object.values(weights).reduce((a, b) => a + b, 0);
    const nf = (w: number) => w / sumWeights;
    const K = 0.015;

    let score = 10.0;
    const distRatio = dist / 100;
    const counts = metrics.eventCounts || {};

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
    const ivanId = 339;
    const start = '2026-03-01';
    const end = '2026-03-16';

    console.log(`Verifying score for Ivan (ID: ${ivanId}) from ${start} to ${end}`);

    // Fetch all daily records
    const daysRes = await pool.query(`
        SELECT period_start, overall_score, metrics
        FROM ecodriving_scores
        WHERE driver_id = $1 AND period_start >= $2 AND period_start < $3
    `, [ivanId, start, end]);

    // Fetch all events
    const eventsRes = await pool.query(`
        SELECT event_type, COUNT(*) as count
        FROM ecodriving_events
        WHERE driver_id = $1 AND started_at >= $2 AND started_at < $3
        GROUP BY event_type
    `, [ivanId, start, end]);

    const aggregatedEvents: any = {};
    eventsRes.rows.forEach(r => aggregatedEvents[r.event_type] = parseInt(r.count));

    let totalDist = 0;
    let totalIdleWeighted = 0;
    let totalRPMWeighted = 0;
    let totalDistForWeights = 0;
    let weightedScoreSum = 0;

    daysRes.rows.forEach(row => {
        const m = row.metrics;
        const d = parseFloat(m.mileage) || 0;
        const s = parseFloat(row.overall_score) || 0;
        
        totalDist += d;
        weightedScoreSum += (s * d);
        if (d > 0) {
            totalIdleWeighted += (parseFloat(m.idleTimePerc) || 0) * d;
            totalRPMWeighted += (parseFloat(m.highRPMPerc) || 0) * d;
            totalDistForWeights += d;
        }
    });

    // Special: Frotcom screenshot shows 2199km, but our Mar 1-15 sum is 2046.
    // The missing 153km is on Feb 28. Let's include it to see if it fixes it.
    console.log("\nIncluding Feb 28 to match Frotcom's 2199km...");
    const feb28 = await pool.query(`
        SELECT overall_score, metrics
        FROM ecodriving_scores
        WHERE driver_id = $1 AND period_start = '2026-02-28'
    `, [ivanId]);

    if (feb28.rows.length > 0) {
        const m = feb28.rows[0].metrics;
        const d = parseFloat(m.mileage) || 0;
        const s = parseFloat(feb28.rows[0].overall_score) || 0;
        totalDist += d;
        weightedScoreSum += (s * d);
        totalIdleWeighted += (parseFloat(m.idleTimePerc) || 0) * d;
        totalRPMWeighted += (parseFloat(m.highRPMPerc) || 0) * d;
        totalDistForWeights += d;

        // Also add Feb 28 events
        const febEvents = await pool.query(`
            SELECT event_type, COUNT(*) as count
            FROM ecodriving_events
            WHERE driver_id = $1 AND started_at >= '2026-02-28' AND started_at < '2026-03-01'
            GROUP BY event_type
        `, [ivanId]);
        febEvents.rows.forEach(r => aggregatedEvents[r.event_type] = (aggregatedEvents[r.event_type] || 0) + parseInt(r.count));
    }

    const aggregatedMetrics = {
        mileage: totalDist,
        idleTimePerc: totalDistForWeights > 0 ? totalIdleWeighted / totalDistForWeights : 0,
        highRPMPerc: totalDistForWeights > 0 ? totalRPMWeighted / totalDistForWeights : 0,
        eventCounts: aggregatedEvents
    };

    const ourRecalcScore = calculateCustomScore(aggregatedMetrics);
    const weightedAvgFrotcomScore = totalDist > 0 ? weightedScoreSum / totalDist : 0;

    console.log("\nFinal Analysis for Ivan (Mar 1-15, including Feb 28 finishing trip):");
    console.log("Total Mileage:", totalDist.toFixed(1), "(Frotcom: 2199.0)");
    console.log("Weighted Average of Frotcom Daily Scores:", weightedAvgFrotcomScore.toFixed(2));
    console.log("Our Recalculated Aggregate Score (Aggregate Metrics):", ourRecalcScore.toFixed(2));
    console.log("Frotcom Dashboard Aggregate Score:", 5.6);
    
    console.log("\nAggregated Metrics Breakdown:");
    console.log("- Idling %:", aggregatedMetrics.idleTimePerc.toFixed(2));
    console.log("- High RPM %:", aggregatedMetrics.highRPMPerc.toFixed(2));
    console.log("- Event Counts:", JSON.stringify(aggregatedMetrics.eventCounts, null, 2));
}

verifyIvan().then(() => pool.end()).catch(console.error);
