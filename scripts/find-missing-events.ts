
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findMissingEvents() {
    try {
        const res = await pool.query(`
      SELECT 
        d.name,
        DATE(s.period_start AT TIME ZONE 'Europe/Sofia') as date,
        (s.metrics->>'mileage')::float as mileage,
        s.metrics->'eventCounts' as event_counts,
        s.metrics->'vehicles' as vehicles
      FROM ecodriving_scores s
      JOIN drivers d ON s.driver_id = d.id
      WHERE DATE(s.period_start AT TIME ZONE 'Europe/Sofia') = '2026-02-25'
      AND (s.metrics->>'mileage')::float > 10
      AND (s.metrics->'eventCounts' IS NULL OR s.metrics->'eventCounts' = '{}'::jsonb)
      ORDER BY mileage DESC
    `);

        console.log(`Found ${res.rows.length} records with >10km but NO events (Feb 24-25):`);
        console.table(res.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findMissingEvents();
