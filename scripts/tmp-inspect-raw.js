
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    const res = await pool.query("SELECT metrics FROM ecodriving_scores WHERE driver_id = 362 AND period_start >= '2026-02-04' LIMIT 1");
    if (res.rows.length > 0) {
        console.log(JSON.stringify(res.rows[0].metrics, null, 2));
    } else {
        console.log("No data found");
    }
    await pool.end();
}

run().catch(console.error);
