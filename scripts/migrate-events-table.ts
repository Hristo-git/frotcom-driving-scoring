/**
 * Create the ecodriving_events table for storing granular driving behavior events.
 * Run once to set up the schema.
 */
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    console.log('Creating ecodriving_events table...');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ecodriving_events (
            id               BIGSERIAL PRIMARY KEY,
            frotcom_event_id BIGINT UNIQUE NOT NULL,
            vehicle_id       INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
            driver_id        INTEGER REFERENCES drivers(id)  ON DELETE SET NULL,
            frotcom_vehicle_id INTEGER,
            frotcom_driver_id  INTEGER,
            event_type       VARCHAR(64) NOT NULL,
            started_at       TIMESTAMPTZ NOT NULL,
            ended_at         TIMESTAMPTZ,
            duration_sec     INTEGER,
            acceleration     NUMERIC(8,4),
            max_engine_speed INTEGER,
            latitude_start   DOUBLE PRECISION,
            longitude_start  DOUBLE PRECISION,
            latitude_end     DOUBLE PRECISION,
            longitude_end    DOUBLE PRECISION,
            address_start    TEXT,
            address_end      TEXT,
            description      TEXT,
            alarm_type       INTEGER,
            extra_data       JSONB,
            created_at       TIMESTAMPTZ DEFAULT NOW()
        );

        -- Index for querying by driver and date
        CREATE INDEX IF NOT EXISTS idx_eco_events_driver_date
            ON ecodriving_events (driver_id, started_at DESC);

        -- Index for querying by vehicle and date
        CREATE INDEX IF NOT EXISTS idx_eco_events_vehicle_date
            ON ecodriving_events (vehicle_id, started_at DESC);

        -- Index for querying by event type
        CREATE INDEX IF NOT EXISTS idx_eco_events_type
            ON ecodriving_events (event_type);
    `);

    console.log('✅ ecodriving_events table created (or already exists).');

    // Verify
    const r = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name='ecodriving_events' 
        ORDER BY ordinal_position
    `);
    console.log('\nColumns:');
    r.rows.forEach((row: any) => console.log(`  ${row.column_name.padEnd(22)} ${row.data_type}`));

    await pool.end();
}

run().catch(async (e) => {
    console.error('Migration failed:', e);
    await pool.end();
    process.exit(1);
});
