
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function listEventTypes() {
    try {
        const res = await pool.query("SELECT DISTINCT event_type FROM ecodriving_events ORDER BY event_type");
        console.log('Unique event types in DB:');
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

listEventTypes();
