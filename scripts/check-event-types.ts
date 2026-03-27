
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkEventTypes() {
    try {
        const res = await pool.query(
            "SELECT event_type, count(*) FROM ecodriving_events WHERE driver_id = 342 GROUP BY event_type"
        );
        console.log('Event Types for Nikolai:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkEventTypes();
