const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function verify() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Checking synchronization for Feb 27, 2026...\n');

        // Check scores for Feb 27
        const scoresRes = await pool.query(`
            SELECT count(*) 
            FROM ecodriving_scores 
            WHERE period_start >= '2026-02-27T00:00:00' 
              AND period_start < '2026-02-28T00:00:00'
        `);
        console.log(`Scores for Feb 27: ${scoresRes.rows[0].count}`);

        // Check records with eventCounts
        const enrichedRes = await pool.query(`
            SELECT count(*) 
            FROM ecodriving_scores 
            WHERE period_start >= '2026-02-27T00:00:00' 
              AND period_start < '2026-02-28T00:00:00'
              AND (metrics->>'eventCounts') IS NOT NULL
        `);
        console.log(`Enriched scores (with events) for Feb 27: ${enrichedRes.rows[0].count}`);

        // Check raw events for Feb 27
        const eventsRes = await pool.query(`
            SELECT count(*) 
            FROM ecodriving_events 
            WHERE started_at >= '2026-02-27T00:00:00+02:00' 
              AND started_at < '2026-02-28T00:00:00+02:00'
        `);
        console.log(`Raw events for Feb 27: ${eventsRes.rows[0].count}`);

        if (parseInt(scoresRes.rows[0].count) > 0) {
            console.log('\nSample data for Feb 27:');
            const sampleRes = await pool.query(`
                SELECT d.name, es.period_start, es.overall_score, (es.metrics->>'totalMileage')::float as km
                FROM ecodriving_scores es
                JOIN drivers d ON es.driver_id = d.id
                WHERE es.period_start >= '2026-02-27T00:00:00' 
                  AND es.period_start < '2026-02-28T00:00:00'
                LIMIT 3
            `);
            sampleRes.rows.forEach(r => {
                console.log(` - ${r.name}: Score ${r.overall_score}, ${r.km} km`);
            });
        }

    } catch (err) {
        console.error('Error during verification:', err);
    } finally {
        await pool.end();
    }
}

verify();
