const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function check() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const res = await pool.query('SELECT count(*) FROM ecodriving_scores');
        console.log('Total scores:', res.rows[0].count);

        const febRes = await pool.query(`
            SELECT count(*) 
            FROM ecodriving_scores 
            WHERE period_start >= '2026-02-01' AND period_start < '2026-03-01'
        `);
        console.log('Feb 2026 scores:', febRes.rows[0].count);

        const sample = await pool.query('SELECT * FROM drivers LIMIT 1');
        console.log('Has drivers:', sample.rows.length > 0);

    } catch (err) {
        console.error('DB Error:', err);
    } finally {
        await pool.end();
    }
}

check();
