
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const DEFAULT_WEIGHTS = {
    harshAccelerationLow: 50.0,
    harshAccelerationHigh: 60.0,
    harshBrakingLow: 65.0,
    harshBrakingHigh: 75.0,
    harshCornering: 70.0,
    accelBrakeSwitch: 1.0, 
    excessiveIdling: 0.0,
    highRPM: 0.0,
    alarms: 0.1,
    noCruiseControl: 0.1,
    accelDuringCruise: 0.1
};

function nf(val: number): number {
    const sumWeights = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    return val / sumWeights;
}

function calculateCustomScore(metrics: any, counts: any, weights: any = DEFAULT_WEIGHTS): number {
    let score = 10.0;
    const distance = parseFloat(metrics.mileage) || 0;
    if (distance <= 0) return 0;

    const K = 1.0;
    const distRatio = distance / 100;

    // Event-based deductions
    if (counts.lowSpeedAcceleration) score -= (counts.lowSpeedAcceleration / distRatio) * nf(weights.harshAccelerationLow) * K * 10;
    if (counts.highSpeedAcceleration) score -= (counts.highSpeedAcceleration / distRatio) * nf(weights.harshAccelerationHigh) * K * 15;
    if (counts.lowSpeedBreak) score -= (counts.lowSpeedBreak / distRatio) * nf(weights.harshBrakingLow) * K * 10;
    if (counts.highSpeedBreak) score -= (counts.highSpeedBreak / distRatio) * nf(weights.harshBrakingHigh) * K * 15;
    if (counts.lateralAcceleration) score -= (counts.lateralAcceleration / distRatio) * nf(weights.harshCornering) * K * 12;
    if (counts.accelBrakeFastShift) score -= (counts.accelBrakeFastShift / distRatio) * nf(weights.accelBrakeSwitch) * K * 5;
    if (counts.accWithCCActive) score -= (counts.accWithCCActive / distRatio) * nf(weights.accelDuringCruise) * K * 5;
    if (counts.noCruise) score -= (counts.noCruise / distRatio) * nf(weights.noCruiseControl) * K * 5;

    // Time-based metrics
    const idlePerc = Math.abs(parseFloat(metrics.idleTimePerc) || 0);
    if (idlePerc > 10 && weights.excessiveIdling > 0) {
        score -= (idlePerc - 10) * nf(weights.excessiveIdling) * 0.5;
    }

    const rpmPerc = Math.abs(parseFloat(metrics.highRPMPerc) || 0);
    if (rpmPerc > 5 && weights.highRPM > 0) {
        score -= (rpmPerc - 5) * nf(weights.highRPM) * 0.2;
    }

    return Math.max(0, Math.min(10, score));
}

async function verifyIvanFinal() {
    console.log("Starting final verification for Ivan Iliev...");
    
    // Ivan's correct internal ID is 339
    const start = '2026-02-28 00:00:00';
    const end = '2026-03-15 23:59:59';
    
    const query = `
        SELECT 
            SUM((metrics->>'mileage')::float) as total_mileage,
            SUM((metrics->>'mileageGps')::float) as total_mileage_gps,
            SUM((metrics->>'mileageCanbus')::float) as total_mileage_canbus,
            AVG((metrics->>'idleTimePerc')::float) as avg_idle,
            AVG((metrics->>'highRPMPerc')::float) as avg_rpm,
            SUM(overall_score * (metrics->>'mileage')::float) / NULLIF(SUM((metrics->>'mileage')::float), 0) as weighted_official_score
        FROM ecodriving_scores
        WHERE driver_id = 339 AND period_start >= $1 AND period_start <= $2
    `;
    
    const res = await pool.query(query, [start, end]);
    const row = res.rows[0];
    
    if (!row) {
        console.log("No data found for Ivan.");
        return;
    }

    // Get aggregated events separately to avoid complex jsonb aggregation in the main query
    const eventsQuery = `
        SELECT key as event_type, SUM(value::int) as total_count
        FROM ecodriving_scores,
             jsonb_each_text(metrics->'eventCounts')
        WHERE driver_id = 339 AND period_start >= $1 AND period_start <= $2
        GROUP BY key
    `;
    const eventsRes = await pool.query(eventsQuery, [start, end]);
    const counts: any = {};
    eventsRes.rows.forEach(r => {
        counts[r.event_type] = parseInt(r.total_count);
    });

    const metrics = {
        mileage: row.total_mileage_canbus || row.total_mileage || 0,
        idleTimePerc: row.avg_idle || 0,
        highRPMPerc: row.avg_rpm || 0
    };
    
    const recalculatedScore = calculateCustomScore(metrics, counts);
    
    console.log("\nResults for Ivan (Feb 28 - Mar 15):");
    console.log("- Total Distance (Canbus):", metrics.mileage);
    console.log("- Avg Idle %:", metrics.idleTimePerc);
    console.log("- Avg RPM %:", metrics.highRPMPerc);
    console.log("- Event Counts:", JSON.stringify(counts, null, 2));
    console.log("- Recalculated Score (With New Formula):", recalculatedScore.toFixed(3));
    console.log("- Weighted Official Score:", parseFloat(row.weighted_official_score).toFixed(3));
    console.log("- Frotcom Dashboard Target Score: 5.6");
    
    console.log("\nVerification Summary:");
    const diff = recalculatedScore - 5.6;
    console.log(`- Difference from Dashboard: ${diff.toFixed(2)}`);
    
    if (Math.abs(diff) < 1.0) {
        console.log("SUCCESS: Score is aligned with Frotcom Dashboard behavior.");
    } else {
        console.log("WARNING: Score is still significantly different.");
    }
}

verifyIvanFinal().then(() => pool.end()).catch(console.error);
