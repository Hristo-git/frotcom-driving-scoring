import pool from '../lib/db';

async function main() {
    const r = await pool.query(`
        SELECT 
            MIN(period_start) as min_start, 
            MAX(period_end) as max_end, 
            COUNT(*) as total_records
        FROM ecodriving_scores
    `);
    console.log('DB date range:', r.rows[0]);

    // Show the most recent distinct periods
    const r2 = await pool.query(`
        SELECT DISTINCT 
            DATE((period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') as day_start,
            DATE((period_end AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') as day_end,
            COUNT(*) as records
        FROM ecodriving_scores
        GROUP BY day_start, day_end
        ORDER BY day_start DESC
        LIMIT 20
    `);
    console.log('\nDistinct periods in DB:');
    r2.rows.forEach(r => console.log(`  ${r.day_start} -> ${r.day_end}  (${r.records} records)`));

    await pool.end();
}

main().catch(console.error);
