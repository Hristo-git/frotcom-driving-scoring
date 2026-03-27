
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkMetrics() {
    try {
        const driverId = 342;
        const res = await pool.query(
            `SELECT 
                period_start, 
                period_start AT TIME ZONE 'Europe/Sofia' as sofia_start,
                metrics->'eventCounts' as event_counts 
             FROM ecodriving_scores 
             WHERE driver_id = $1 
             ORDER BY period_start ASC`,
            [driverId]
        );
        res.rows.forEach(r => {
            console.log(`UTC: ${r.period_start.toISOString()} | Sofia: ${r.sofia_start} | Has Events: ${!!r.event_counts}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkMetrics();
