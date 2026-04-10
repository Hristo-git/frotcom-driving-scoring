import { ScoringEngine } from '../lib/scoring';
import { DEFAULT_WEIGHTS } from '../lib/scoring-types';
import pool from '../lib/db';

async function test() {
    const res = await pool.query(`
        SELECT metrics 
        FROM ecodriving_scores es 
        JOIN drivers d ON es.driver_id = d.id 
        WHERE d.name LIKE '%Живко Георгиев%' 
          AND period_start = '2026-03-01' 
          AND period_end = '2026-03-27'
    `);
    
    if (res.rows.length === 0) {
        console.log("No data found for Zhivko.");
        return;
    }

    const metrics = res.rows[0].metrics;
    const engine = new ScoringEngine();
    const scores = engine.calculateDetailedScores(metrics, DEFAULT_WEIGHTS);
    
    console.log("Zhivko Detailed Scores:");
    console.table(Object.entries(scores).map(([k, v]) => ({ criterion: k, score: v })));
    
    const final = engine.calculateCustomScore(metrics, DEFAULT_WEIGHTS);
    console.log(`\nFinal Calculated Score: ${final.toFixed(2)}`);
    
    await pool.end();
}

test().catch(console.error);
