
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function deepDebugMiroslav() {
    const driverId = 306;
    console.log(`Deep checking events for Driver ID: ${driverId}`);

    try {
        // 1. Check events with dates
        const evRes = await pool.query(`
      SELECT 
        DATE(started_at AT TIME ZONE 'Europe/Sofia') as event_date,
        event_type,
        count(*) as count
      FROM ecodriving_events 
      WHERE driver_id = $1 
      GROUP BY event_date, event_type
      ORDER BY event_date DESC
    `, [driverId]);

        console.log('Events in ecodriving_events for this driver ID:');
        console.table(evRes.rows);

        // 2. Check events for the vehicle mentioned in logs (СВ3835НО)
        const vehRes = await pool.query(`
      SELECT 
        DATE(started_at AT TIME ZONE 'Europe/Sofia') as event_date,
        driver_id,
        count(*) as count
      FROM ecodriving_events 
      WHERE vehicle_id = (SELECT id FROM vehicles WHERE license_plate = 'СВ3835НО')
      GROUP BY event_date, driver_id
      ORDER BY event_date DESC
    `);

        console.log('\nEvents for vehicle СВ3835НО in ecodriving_events:');
        console.table(vehRes.rows);

        // 3. Check scores for this driver
        const scoreRes = await pool.query(`
      SELECT 
        id, 
        DATE(period_start AT TIME ZONE 'Europe/Sofia') as score_date,
        (metrics->>'mileage')::float as mileage,
        metrics->'eventCounts' as event_counts
      FROM ecodriving_scores
      WHERE driver_id = $1
      AND period_start >= '2026-02-20'
      ORDER BY score_date DESC
    `, [driverId]);

        console.log('\nScores in ecodriving_scores for this driver ID:');
        console.table(scoreRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

deepDebugMiroslav();
