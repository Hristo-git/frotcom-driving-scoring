const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkSync() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Daily counts for last 5 days:');
        const res = await pool.query(`
            SELECT DATE(period_start) as date, COUNT(*) 
            FROM ecodriving_scores 
            WHERE period_start >= NOW() - INTERVAL '5 days'
            GROUP BY 1
            ORDER BY 1 DESC
        `);
        res.rows.forEach(r => {
            console.log(` - ${new Date(r.date).toISOString().split('T')[0]}: ${r.count} records`);
        });

        const eventRes = await pool.query(`
            SELECT DATE(started_at) as date, COUNT(*) 
            FROM ecodriving_events 
            WHERE started_at >= NOW() - INTERVAL '5 days'
            GROUP BY 1
            ORDER BY 1 DESC
        `);
        console.log('\nEvent counts for last 5 days:');
        eventRes.rows.forEach(r => {
            console.log(` - ${new Date(r.date).toISOString().split('T')[0]}: ${r.count} events`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkSync();
