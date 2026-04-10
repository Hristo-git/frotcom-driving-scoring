import pool from '../lib/db';

async function test() {
    console.log("Fetching exact data for Yordan Angelov...");
    
    const res = await pool.query(`
        SELECT 
            es.id,
            es.overall_score as f_score, 
            es.metrics->>'mileage' as dist, 
            es.metrics->'eventCounts' as events, 
            es.metrics->>'highRPMPerc' as rpm, 
            es.metrics->>'idleTimePerc' as idle,
            es.metrics->>'failingCriteria' as failing
        FROM ecodriving_scores es 
        JOIN drivers d ON es.driver_id = d.id 
        WHERE d.name = 'Yordan Angelov - Русе'
        ORDER BY es.overall_score ASC
        LIMIT 5;
    `);
    
    console.log(JSON.stringify(res.rows, null, 2));
    await pool.end();
}

test().catch(console.error);
