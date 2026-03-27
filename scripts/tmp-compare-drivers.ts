import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';

async function run() {
    try {
        // Pick 5 drivers with most mileage in March
        const res = await pool.query(`
            SELECT d.id, d.name, SUM(CAST(es.metrics->>'mileage' AS NUMERIC)) as dist
            FROM drivers d
            JOIN ecodriving_scores es ON d.id = es.driver_id
            WHERE es.period_start >= '2026-03-01'
            GROUP BY d.id, d.name
            ORDER BY dist DESC
            LIMIT 5
        `);
        
        const drivers = res.rows;
        console.log(`Extracting Target Frotcom Scores for 5 Top Drivers (March 1 - 27):\n`);

        for (const d of drivers) {
            const result = await pool.query(`
                SELECT 
                    SUM(overall_score * (metrics->>'mileage')::float) / NULLIF(SUM((metrics->>'mileage')::float), 0) as weighted_official_score
                FROM ecodriving_scores
                WHERE driver_id = $1 AND period_start >= '2026-03-01' AND period_start <= '2026-03-27'
            `, [d.id]);
            
            const targetScore = result.rows[0].weighted_official_score !== null ? parseFloat(result.rows[0].weighted_official_score).toFixed(2) : 'N/A';
            
            console.log(`Driver: ${d.name} (ID: ${d.id})`);
            console.log(`  Target Frotcom Score: ${targetScore}`);
            console.log('------------------------------------');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

run();
