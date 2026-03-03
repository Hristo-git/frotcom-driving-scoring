
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
            (metrics->>'mileage')::numeric as d,
            (metrics->>'idleTimePerc')::numeric as idle,
            (metrics->>'highRPMPerc')::numeric as rpm
        FROM ecodriving_scores
        WHERE driver_id = 362
          AND period_start >= '2026-02-01'
          AND period_end <= '2026-02-28 23:59:59'
    `);

    let totalD = 0;
    let weightedIdle = 0;
    let weightedRPM = 0;

    res.rows.forEach(r => {
        const d = parseFloat(r.d) || 0;
        if (d > 0) {
            totalD += d;
            weightedIdle += (parseFloat(r.idle) || 0) * d;
            weightedRPM += (parseFloat(r.rpm) || 0) * d;
        }
    });

    console.log('--- GORAN AVG METRICS ---');
    console.log('Avg Idle %:', (weightedIdle / totalD).toFixed(2));
    console.log('Avg RPM %:', (weightedRPM / totalD).toFixed(2));

    await pool.end();
}

main().catch(console.error);
