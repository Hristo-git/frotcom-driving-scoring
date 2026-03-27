
import { ScoringEngine, DEFAULT_WEIGHTS } from '../lib/scoring';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testFullFormula() {
    const ivanId = 339;
    console.log("Testing Full Formula for Ivan (ID 339)...");

    // 1. Get aggregated metrics
    const daysRes = await pool.query(`
        SELECT metrics, period_start
        FROM ecodriving_scores
        WHERE driver_id = $1 AND period_start >= '2026-03-01' AND period_start < '2026-03-16'
    `, [ivanId]);

    const evRes = await pool.query(`
        SELECT event_type, COUNT(*) as count
        FROM ecodriving_events
        WHERE driver_id = $1 AND started_at >= '2026-03-01' AND started_at < '2026-03-16'
        GROUP BY event_type
    `, [ivanId]);

    const aggregatedEvents: any = {};
    evRes.rows.forEach(r => aggregatedEvents[r.event_type] = parseInt(r.count));

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

    const metrics = {
        mileage: totalDist,
        idleTimePerc: totalDistForWeights > 0 ? totalIdleWeighted / totalDistForWeights : 0,
        highRPMPerc: totalDistForWeights > 0 ? totalRPMWeighted / totalDistForWeights : 0,
        eventCounts: aggregatedEvents
    };

    const engine = new ScoringEngine();
    // We'll manually call calculateCustomScore as it's private/internal-ish 
    // Actually it's exported in my last script? No, it's public in lib/scoring.ts
    
    // @ts-ignore
    const finalScore = engine.calculateCustomScore(metrics, DEFAULT_WEIGHTS);

    console.log("\nAggregated Metrics:");
    console.log(JSON.stringify(metrics, null, 2));
    
    console.log("\nCalculated Multi-Metric Score:", finalScore.toFixed(2));
    console.log("Frotcom Dashboard:", 5.6);
}

testFullFormula().then(() => pool.end()).catch(console.error);
