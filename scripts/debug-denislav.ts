import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function debugDenislav() {
    const driverSearch = 'Денислав Богомилов Петров';
    console.log(`Searching for driver: ${driverSearch}`);

    const driverRes = await pool.query(
        'SELECT id, name FROM drivers WHERE name ILIKE $1',
        [`%Денислав%Петров%`]
    );

    if (driverRes.rows.length === 0) {
        console.log('Driver not found');
        return;
    }

    const driverId = driverRes.rows[0].id;
    const driverName = driverRes.rows[0].name;
    console.log(`Found driver: ${driverName} (ID: ${driverId})`);

    const date = '2026-02-25';
    console.log(`\n--- Checking ecodriving_scores for ${date} ---`);
    const scoreRes = await pool.query(
        `SELECT id, overall_score as score, metrics 
         FROM ecodriving_scores 
         WHERE driver_id = $1 
         AND DATE(period_start AT TIME ZONE 'Europe/Sofia') = $2`,
        [driverId, date]
    );

    if (scoreRes.rows.length === 0) {
        console.log('No scoring record found for this date');
    } else {
        console.log(`Found ${scoreRes.rows.length} record(s):`);
        for (const row of scoreRes.rows) {
            console.log(`ID: ${row.id}, Score: ${row.score}, Distance: ${row.distance}`);
            console.log('Metrics:', JSON.stringify(row.metrics, null, 2));
        }
    }

    console.log(`\n--- Checking ecodriving_events for ${date} ---`);
    const eventRes = await pool.query(
        `SELECT event_type, count(*) as count 
         FROM ecodriving_events 
         WHERE driver_id = $1 
         AND DATE(started_at AT TIME ZONE 'Europe/Sofia') = $2
         GROUP BY event_type`,
        [driverId, date]
    );

    if (eventRes.rows.length === 0) {
        console.log('No events found in ecodriving_events table for this date');
    } else {
        console.log('Events found:');
        console.table(eventRes.rows);
    }

    await pool.end();
}

debugDenislav().catch(console.error);
