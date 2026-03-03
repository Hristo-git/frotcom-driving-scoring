
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    const res = await pool.query("SELECT overall_score, metrics FROM ecodriving_scores WHERE driver_id = 362 AND period_start >= '2026-02-08' AND period_start < '2026-02-09'");
    if (res.rows.length > 0) {
        console.log("Feb 8 Data for Goran:");
        console.log(JSON.stringify(res.rows[0], null, 2));
    } else {
        console.log("No data found for Feb 8");
    }
    await pool.end();
}

run().catch(console.error);
