import { ScoringEngine } from '../lib/scoring';
import { DEFAULT_WEIGHTS } from '../lib/scoring-types';
import pool from '../lib/db';

async function test() {
    const res = await pool.query(`
        SELECT metrics 
        FROM ecodriving_scores es 
        JOIN drivers d ON es.driver_id = d.id 
        WHERE d.name LIKE '%Николай Красимиров%' 
          AND es.metrics->>'mileage' = '4245.7'
    `);
    
    if (res.rows.length === 0) {
        console.log("No data found for Nikolai with mileage 4245.7.");
        return;
    }

    const metrics = res.rows[0].metrics;
    const engine = new ScoringEngine();
    const scores = engine.calculateDetailedScores(metrics, DEFAULT_WEIGHTS);
    
    console.log("Nikolai Detailed Scores (Mileage 4245.7):");
    console.log(`RPM: ${metrics.highRPMPerc}% | Idle: ${metrics.idleTimePerc}%`);
    console.table(Object.entries(scores).map(([k, v]) => ({ criterion: k, score: v.toFixed(2) })));
    
    const final = engine.calculateCustomScore(metrics, DEFAULT_WEIGHTS, 83);
    console.log(`\nFinal Calculated Score: ${final.toFixed(2)}`);
    
    await pool.end();
}

test().catch(console.error);
