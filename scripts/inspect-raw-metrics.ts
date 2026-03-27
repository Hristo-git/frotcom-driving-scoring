
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspectRawMetrics() {
    try {
        const driverId = 342;
        const res = await pool.query(
            "SELECT metrics FROM ecodriving_scores WHERE driver_id = $1 LIMIT 1",
            [driverId]
        );
        console.log('Raw Metrics JSON:', JSON.stringify(res.rows[0].metrics, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspectRawMetrics();
