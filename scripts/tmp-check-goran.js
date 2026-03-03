
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
    if (driverRes.rows.length === 0) {
        console.log('Driver not found');
        return;
    }
    const driverId = driverRes.rows[0].id;
    console.log('Driver ID:', driverId);

    const res = await pool.query(`
        SELECT 
            period_start::date,
            overall_score,
            (metrics->>'mileage')::numeric as mileage
        FROM ecodriving_scores
        WHERE driver_id = $1
          AND period_start >= '2026-02-01'
          AND period_end <= '2026-02-28 23:59:59'
        ORDER BY period_start
    `, [driverId]);

    let totalWeightedScore = 0;
    let totalDistance = 0;

    res.rows.forEach(row => {
        const score = parseFloat(row.overall_score);
        const distance = parseFloat(row.mileage);
        console.log(`${row.period_start.toISOString().split('T')[0]}: Score=${score}, Distance=${distance}`);
        if (distance > 0) {
            totalWeightedScore += score * distance;
            totalDistance += distance;
        }
    });

    if (totalDistance > 0) {
        console.log('--- RESULT ---');
        console.log('Total Distance:', totalDistance);
        console.log('Weighted Average:', (totalWeightedScore / totalDistance).toFixed(2));
    } else {
        console.log('No mileage for February');
    }

    await pool.end();
}

main().catch(console.error);
