
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findMissingNikolai() {
    try {
        const driverId = 342;
        const start = '2026-03-01';
        const end = '2026-03-15';
        
        const res = await pool.query(
            `SELECT period_start, metrics FROM ecodriving_scores 
             WHERE driver_id = $1 AND period_start >= $2 AND period_end <= $3 
             ORDER BY period_start ASC`,
            [driverId, start, end]
        );
        
        console.log(`Checking ${res.rows.length} days for Nikolai...`);
        
        for (const row of res.rows) {
            const hasEvents = row.metrics && row.metrics.eventCounts && Object.keys(row.metrics.eventCounts).length > 0;
            console.log(`Day: ${row.period_start.toISOString().split('T')[0]} | Has Events: ${hasEvents}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findMissingNikolai();
