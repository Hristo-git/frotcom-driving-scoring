
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    const driverId = 362; // Goran

    // 1. Total Distance from scores
    const distRes = await pool.query(`
        SELECT SUM((metrics->>'mileage')::numeric) as dist
        FROM ecodriving_scores
        WHERE driver_id = $1
          AND period_start >= '2026-02-01'
          AND period_end <= '2026-02-28 23:59:59'
    `, [driverId]);
    const totalDist = parseFloat(distRes.rows[0].dist);

    // 2. Total Events from granular table
    const eventRes = await pool.query(`
        SELECT event_type, COUNT(*) as count
        FROM ecodriving_events
        WHERE driver_id = $1
          AND started_at >= '2026-02-01'
          AND started_at <= '2026-02-28 23:59:59'
        GROUP BY event_type
    `, [driverId]);

    console.log('--- GORAN FEB GRANULAR EVENTS ---');
    console.log('Total Distance:', totalDist);
    eventRes.rows.forEach(r => {
        console.log(`${r.event_type}: ${r.count}`);
    });

    await pool.end();
}

main().catch(console.error);
