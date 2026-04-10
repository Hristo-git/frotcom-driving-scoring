import pool from '../lib/db';

async function test() {
    const res = await pool.query(`
        SELECT d.name, es.metrics->'eventCounts' as events, es.metrics->>'mileage' as dist
        FROM ecodriving_scores es 
        JOIN drivers d ON es.driver_id = d.id 
        WHERE d.name LIKE '%Николай Красимиров%' 
          AND es.metrics->>'mileage' = '4245.7'
    `);
    
    if (res.rows.length === 0) {
        console.log("No data found.");
        return;
    }

    console.log("Nikolai Metrics:");
    console.log(`Distance: ${res.rows[0].dist}`);
    console.log("Events:", JSON.stringify(res.rows[0].events, null, 2));
    
    await pool.end();
}

test().catch(console.error);
