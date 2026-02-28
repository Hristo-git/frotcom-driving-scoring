const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkLast() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Checking last 5 scoring records...\n');
        const res = await pool.query(`
            SELECT d.name, es.period_start, es.overall_score
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            ORDER BY es.period_start DESC
            LIMIT 5
        `);

        res.rows.forEach(r => {
            console.log(` - ${r.name}: Period ${r.period_start}, Score ${r.overall_score}`);
        });

        // Check for ANY event on Feb 27/28
        const evRes = await pool.query(`
            SELECT count(*) from ecodriving_events 
            WHERE sync_date >= NOW() - INTERVAL '24 hours'
        `);
        // wait, does ecodriving_events have sync_date? Or started_at?
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkLast();
