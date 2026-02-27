import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const r = await pool.query(`
        SELECT 
            MIN(period_start) AS first_record,
            MAX(period_start) AS last_record,
            COUNT(DISTINCT DATE(period_start AT TIME ZONE 'Europe/Sofia')) AS distinct_days,
            COUNT(*) AS total_records
        FROM ecodriving_scores
    `);
    const row = r.rows[0];
    console.log('First record:', row.first_record?.toISOString());
    console.log('Last record: ', row.last_record?.toISOString());
    console.log('Distinct days:', row.distinct_days);
    console.log('Total records:', row.total_records);

    const r2 = await pool.query(`
        SELECT 
            DATE(period_start AT TIME ZONE 'Europe/Sofia') AS sofia_date,
            COUNT(*) AS drivers
        FROM ecodriving_scores
        GROUP BY 1 ORDER BY 1 DESC
        LIMIT 25
    `);
    console.log('\nPer-day records:');
    r2.rows.forEach((row: any) => console.log(' ', row.sofia_date, '|', row.drivers, 'drivers'));
    await pool.end();
}
run().catch(console.error);
