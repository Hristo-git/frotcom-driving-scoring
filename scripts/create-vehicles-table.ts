
import pool from '../lib/db';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function migrate() {
    try {
        console.log('Creating vehicles table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vehicles (
                id SERIAL PRIMARY KEY,
                frotcom_id TEXT UNIQUE NOT NULL,
                license_plate TEXT NOT NULL,
                metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('Vehicles table created.');

        // Add index on frotcom_id for faster lookups
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_vehicles_frotcom_id ON vehicles(frotcom_id);`);
        console.log('Index created.');

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

migrate();
