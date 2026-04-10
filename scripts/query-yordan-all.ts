import pool from '../lib/db';
import fs from 'fs';

async function test() {
    const res = await pool.query(`
        SELECT 
            es.id,
            es.overall_score as f_score, 
            es.metrics->>'mileage' as dist, 
            es.metrics->'eventCounts' as events, 
            es.metrics->>'highRPMPerc' as rpm, 
            es.metrics->>'idleTimePerc' as idle
        FROM ecodriving_scores es 
        JOIN drivers d ON es.driver_id = d.id 
        WHERE d.name = 'Yordan Angelov - Русе'
    `);
    
    fs.writeFileSync('yordan_all.txt', JSON.stringify(res.rows, null, 2));
    console.log(`Saved ${res.rows.length} rows for Yordan Angelov.`);
    await pool.end();
}

test().catch(console.error);
