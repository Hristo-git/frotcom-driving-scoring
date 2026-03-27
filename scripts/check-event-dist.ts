
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkEventDistribution() {
    try {
        const driverId = 342;
        const res = await pool.query(
            `SELECT 
                DATE(started_at AT TIME ZONE 'Europe/Sofia') as event_date,
                COUNT(*) as count
             FROM ecodriving_events 
             WHERE driver_id = $1 
             GROUP BY event_date 
             ORDER BY event_date ASC`,
            [driverId]
        );
        console.log('Event Distribution for Nikolai:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkEventDistribution();
