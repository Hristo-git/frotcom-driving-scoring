import { ScoringEngine } from '../lib/scoring';
import { DEFAULT_WEIGHTS } from '../lib/scoring-types';
import pool from '../lib/db';

async function test() {
    const engine = new ScoringEngine();
    const name = 'Николай Красимиров Костадинов - Петрич';
    
    const res = await pool.query(`
        SELECT 
            period_start,
            overall_score as f_score,
            metrics
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE d.name = $1
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= '2026-03-01'
          AND DATE((es.period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= '2026-03-27'
    `, [name]);

    console.log("Nikolai Daily Parity Audit:");
    res.rows.forEach(r => {
        const m = r.metrics;
        const d = parseFloat(m.mileage) || 0;
        const ourScore = engine.calculateCustomScore(m, DEFAULT_WEIGHTS);
        const fScore = parseFloat(r.f_score) || 0;
        const diff = ourScore - fScore;
        
        if (Math.abs(diff) > 1.0) {
            console.log(`Date: ${r.period_start} | Dist: ${d.toFixed(1)} | Frotcom: ${fScore.toFixed(2)} | Ours: ${ourScore.toFixed(2)} | Diff: ${diff.toFixed(2)}`);
        }
    });

    await pool.end();
}
test().catch(console.error);
