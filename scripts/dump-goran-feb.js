
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    const res = await pool.query(`
        SELECT 
            period_start, 
            overall_score, 
            metrics 
        FROM ecodriving_scores 
        WHERE driver_id = 362 
          AND period_start >= '2026-02-01' 
          AND period_end <= '2026-03-01' 
        ORDER BY period_start
    `);

    console.log(JSON.stringify(res.rows, null, 2));
    await pool.end();
}

run().catch(console.error);
