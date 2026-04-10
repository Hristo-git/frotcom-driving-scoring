import pool from '../lib/db';

async function test() {
    const res = await pool.query(`
        SELECT 
            (metrics->>'hasLowMileage') as low_mileage,
            (metrics->>'mileage') as mileage,
            overall_score
        FROM ecodriving_scores
        WHERE overall_score = 0
        LIMIT 20;
    `);
    
    console.log("Samples of 0 scores:");
    res.rows.forEach(r => {
        console.log(`Mileage: ${r.mileage} | hasLowMileage: ${r.low_mileage} | Score: ${r.overall_score}`);
    });

    const res2 = await pool.query(`
        SELECT 
            (metrics->>'hasLowMileage') as low_mileage,
            MIN(CAST(metrics->>'mileage' AS NUMERIC)) as min_m,
            MAX(CAST(metrics->>'mileage' AS NUMERIC)) as max_m,
            COUNT(*)
        FROM ecodriving_scores
        WHERE overall_score > 0
        GROUP BY 1;
    `);
    console.log("\nSamples of > 0 scores:");
    res2.rows.forEach(r => {
        console.log(`hasLowMileage: ${r.low_mileage} | Range: ${r.min_m} to ${r.max_m} | Count: ${r.count}`);
    });

    await pool.end();
}
test().catch(console.error);
