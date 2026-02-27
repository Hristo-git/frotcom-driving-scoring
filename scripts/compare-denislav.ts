import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function compareRecords() {
    const ids = [39390, 39535];
    console.log(`Comparing records ${ids.join(', ')}:`);

    const res = await pool.query(
        `SELECT id, driver_id, overall_score, metrics, period_start, period_end, calculated_at 
         FROM ecodriving_scores 
         WHERE id = ANY($1)`,
        [ids]
    );

    for (const row of res.rows) {
        console.log(`\n--- Record ID: ${row.id} ---`);
        console.log(`Score: ${row.overall_score}`);
        console.log(`Period: ${row.period_start} to ${row.period_end}`);
        const aggRes = await pool.query(`
            SELECT count(*) FROM ecodriving_events 
            WHERE driver_id = $1 
              AND DATE(started_at AT TIME ZONE 'Europe/Sofia') = (TO_CHAR($2 AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Sofia', 'YYYY-MM-DD'))::date
        `, [row.driver_id, row.period_start]);
        console.log(`Events in DB for Sofia date matches: ${aggRes.rows[0].count}`);
    }

    await pool.end();
}

compareRecords().catch(console.error);
