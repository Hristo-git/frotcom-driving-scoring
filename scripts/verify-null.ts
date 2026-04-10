import pool from '../lib/db';
import { ScoringEngine } from '../lib/scoring';
import { DEFAULT_WEIGHTS } from '../lib/scoring-types';

async function verifyNullEvents() {
    const res = await pool.query(`
        SELECT d.name, es.overall_score as f_score, es.metrics
        FROM ecodriving_scores es 
        JOIN drivers d ON es.driver_id = d.id 
        WHERE d.name = 'Yordan Angelov - Русе'
    `);
    
    const engine = new ScoringEngine();
    
    res.rows.forEach(r => {
        const dist = parseFloat(r.metrics.mileage) || 0;
        if (dist < 10) return; // Ignore micro-trips
        
        const fScore = parseFloat(r.f_score);
        const myScore = engine.calculateCustomScore(r.metrics, DEFAULT_WEIGHTS, 83);
        
        console.log(`\nDist: ${dist.toFixed(1)}km | Frotcom: ${fScore.toFixed(2)} | Ours: ${myScore.toFixed(2)}`);
        console.log(`Events Obj: ${JSON.stringify(r.metrics.eventCounts)}`);
        
        const d = engine.calculateDetailedScores(r.metrics, DEFAULT_WEIGHTS);
        console.log(`RPM: ${d.rpm.toFixed(1)} (${r.metrics.highRPMPerc}%) | Idle: ${d.idle.toFixed(1)} (${r.metrics.idleTimePerc}%)`);
        console.log(`AccL: ${d.accelLow.toFixed(1)} | AccH: ${d.accelHigh.toFixed(1)} | BrkL: ${d.brakeLow.toFixed(1)} | BrkH: ${d.brakeHigh.toFixed(1)} | Corn: ${d.corner.toFixed(1)}`);
    });

    await pool.end();
}

verifyNullEvents().catch(console.error);
