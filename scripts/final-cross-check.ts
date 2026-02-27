import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function finalCheck() {
    console.log('--- FINAL CROSS CHECK ---');
    const res = await pool.query(`
        WITH score_info AS (
            SELECT id, driver_id, period_start, metrics,
                   DATE(period_start AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Sofia') as sofia_date
            FROM ecodriving_scores 
            WHERE id = 39390
        )
        SELECT s.id, s.driver_id, s.period_start, s.sofia_date,
               (s.metrics->'eventCounts') as counts_in_metrics,
               (SELECT count(*) FROM ecodriving_events e 
                WHERE e.driver_id = s.driver_id 
                  AND DATE(e.started_at AT TIME ZONE 'Europe/Sofia') = s.sofia_date) as actual_db_count
        FROM score_info s
    `);
    console.table(res.rows.map(r => ({
        ...r,
        counts_in_metrics: JSON.stringify(r.counts_in_metrics)
    })));
    await pool.end();
}
finalCheck();
