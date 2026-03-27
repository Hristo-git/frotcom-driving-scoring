
import pool from '../lib/db';
import { ScoringEngine, DEFAULT_WEIGHTS } from '../lib/scoring';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    const startDate = '2026-03-01';
    const endDate = '2026-03-07';
    const driverName = 'Костадин Ангелов Аклашев - Петрич';
    
    // 1. Get raw metrics from DB rows for the week
    const res = await pool.query(`
        SELECT metrics
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE d.name = $1 AND period_start >= $2 AND period_end <= $3
    `, [driverName, startDate, endDate + ' 23:59:59']);

    let totalDist = 0;
    let totalIdleTimePercWeighted = 0;
    let totalHighRPMPercWeighted = 0;
    const totalEvents: Record<string, number> = {};

    res.rows.forEach(row => {
        const m = row.metrics;
        const dist = parseFloat(m.mileage) || 0;
        if (dist > 0) {
            totalDist += dist;
            totalIdleTimePercWeighted += (parseFloat(m.idleTimePerc) || 0) * dist;
            totalHighRPMPercWeighted += (parseFloat(m.highRPMPerc) || 0) * dist;
            
            if (m.eventCounts) {
                for (const [key, val] of Object.entries(m.eventCounts)) {
                    totalEvents[key] = (totalEvents[key] || 0) + (val as number);
                }
            }
        }
    });

    const aggregatedMetrics = {
        mileage: totalDist,
        idleTimePerc: totalDist > 0 ? totalIdleTimePercWeighted / totalDist : 0,
        highRPMPerc: totalDist > 0 ? totalHighRPMPercWeighted / totalDist : 0,
        eventCounts: totalEvents
    };

    console.log("Aggregated Metrics for the week:");
    console.log(JSON.stringify(aggregatedMetrics, null, 2));

    const scoring = new ScoringEngine();
    // Use private method via any for testing
    const calculatedScore = (scoring as any).calculateCustomScore(aggregatedMetrics, DEFAULT_WEIGHTS);

    console.log("\nResults:");
    console.log(`Aggregated Distance: ${totalDist.toFixed(2)} km`);
    console.log(`Calculated Score on Aggregated Metrics: ${calculatedScore.toFixed(4)}`);
    // Note: Frotcom Official was 6.0130
    
    await pool.end();
}

main().catch(console.error);
