const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function check() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Event counts per day (Sofia Time):');
        const res = await pool.query(`
            SELECT 
                DATE(started_at AT TIME ZONE 'Europe/Sofia') as sofia_date,
                count(*)
            FROM ecodriving_events
            WHERE started_at >= '2026-02-24T00:00:00+02:00'
            GROUP BY 1
            ORDER BY 1 DESC
        `);
        res.rows.forEach(r => console.log(` - ${r.sofia_date.toISOString().split('T')[0]}: ${r.count}`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

check();
