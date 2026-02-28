const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function check() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Recent unique period_start values:');
        const res = await pool.query(`
            SELECT DISTINCT period_start 
            FROM ecodriving_scores 
            ORDER BY period_start DESC 
            LIMIT 10
        `);
        res.rows.forEach(r => console.log(` - ${r.period_start}`));

        console.log('\nCounts per day (Sofia Time):');
        const counts = await pool.query(`
            SELECT 
                DATE(period_start AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Sofia') as sofia_date,
                count(*)
            FROM ecodriving_scores
            GROUP BY 1
            ORDER BY 1 DESC
            LIMIT 5
        `);
        counts.rows.forEach(r => console.log(` - ${r.sofia_date.toISOString().split('T')[0]}: ${r.count}`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

check();
