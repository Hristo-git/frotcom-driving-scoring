
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function compareDriver(namePart) {
    const dRes = await pool.query('SELECT id, name FROM drivers WHERE name LIKE $1', [`%${namePart}%`]);
    if (dRes.rows.length === 0) return console.log(`Driver not found: ${namePart}`);
    const { id, name } = dRes.rows[0];

    const res = await pool.query(`
        SELECT 
            overall_score as score,
            (metrics->>'mileage')::numeric as mileage
        FROM ecodriving_scores
        WHERE driver_id = $1
          AND period_start >= '2026-02-01'
          AND period_end <= '2026-02-28 23:59:59'
    `, [id]);

    let totalW = 0;
    let totalD = 0;
    res.rows.forEach(r => {
        const s = parseFloat(r.score);
        const d = parseFloat(r.mileage);
        if (d > 0) {
            totalW += s * d;
            totalD += d;
        }
    });

    console.log(`Driver: ${name}`);
    console.log(`- Total Distance: ${totalD.toFixed(2)}`);
    console.log(`- Variant A (Weighted Average): ${(totalW / totalD).toFixed(2)}`);
    console.log('');
}

async function main() {
    await compareDriver('Горан');
    await compareDriver('Кръстев');
    await pool.end();
}

main().catch(console.error);
