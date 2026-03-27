
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const res = await pool.query("SELECT metrics, overall_score FROM ecodriving_scores WHERE driver_id = 339 AND period_start = '2026-03-01'");
    if (res.rows.length > 0) {
        console.log("Score for Mar 1:", res.rows[0].overall_score);
        console.log("Metrics:", JSON.stringify(res.rows[0].metrics, null, 2));

        const evRes = await pool.query("SELECT event_type, COUNT(*) as count FROM ecodriving_events WHERE driver_id = 339 AND started_at >= '2026-03-01' AND started_at < '2026-03-02' GROUP BY event_type");
        console.log("Events for Mar 1:", evRes.rows);
    } else {
        console.log("No data found for Mar 1.");
    }
}

check().finally(() => pool.end());
