
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    const res = await pool.query(`
        SELECT 
            period_start::date as date,
            overall_score as score,
            (metrics->>'mileage')::numeric as mileage,
            (metrics->>'hasLowMileage')::boolean as low_mileage
        FROM ecodriving_scores
        WHERE driver_id = 362
          AND period_start >= '2026-02-01'
          AND period_end <= '2026-02-28 23:59:59'
        ORDER BY period_start
    `);

    let totalWeighted = 0;
    let totalDist = 0;
    let totalWeightedFixed = 0;
    let totalDistFixed = 0;

    res.rows.forEach(r => {
        const s = parseFloat(r.score);
        const d = parseFloat(r.mileage);
        if (d > 0) {
            totalWeighted += s * d;
            totalDist += d;

            // Try excluding low_mileage days
            if (!r.low_mileage) {
                totalWeightedFixed += s * d;
                totalDistFixed += d;
            }
            console.log(`${r.date.toISOString().split('T')[0]}: Score=${s}, Dist=${d}, LowMileage=${r.low_mileage}`);
        }
    });

    console.log('--- RESULTS ---');
    console.log('A (All):', (totalWeighted / totalDist).toFixed(2));
    console.log('A (Exclude LowMileage):', (totalWeightedFixed / totalDistFixed).toFixed(2));

    await pool.end();
}

main().catch(console.error);
