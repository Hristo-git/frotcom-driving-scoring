
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    const name = 'Горан Димишковска';
    const driverRes = await pool.query('SELECT id FROM drivers WHERE name LIKE $1', [`%${name}%`]);
    const driverId = driverRes.rows[0].id;

    const res = await pool.query(`
        SELECT 
            metrics->'eventCounts' as counts,
            (metrics->>'mileage')::numeric as mileage
        FROM ecodriving_scores
        WHERE driver_id = $1
          AND period_start >= '2026-02-01'
          AND period_end <= '2026-02-28 23:59:59'
    `, [driverId]);

    let totalEvents = {};
    let totalDist = 0;

    res.rows.forEach(row => {
        const dist = parseFloat(row.mileage) || 0;
        totalDist += dist;
        if (row.counts) {
            for (const [k, v] of Object.entries(row.counts)) {
                totalEvents[k] = (totalEvents[k] || 0) + v;
            }
        }
    });

    console.log('--- GORAN FEB TOTALS ---');
    console.log('Total Mileage:', totalDist.toFixed(2));
    console.log('Total Events:', totalEvents);

    // Try a simple B calculation
    // Note: I don't know the exact factors, but let's see ratios
    const distRatio = totalDist / 100;
    console.log('Events per 100km:');
    for (const [k, v] of Object.entries(totalEvents)) {
        console.log(`${k}: ${(v / distRatio).toFixed(2)}`);
    }

    await pool.end();
}

main().catch(console.error);
