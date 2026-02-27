/**
 * Step 1: Delete all ecodriving_scores rows where mileage = 0.
 * These are noise from the old sync code that stored every driver regardless of activity.
 * Safe to delete — no real driving data is lost.
 */
import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const preview = await pool.query(`
        SELECT COUNT(*) AS zero_km_count
        FROM ecodriving_scores
        WHERE (metrics->>'mileage')::numeric = 0
           OR metrics->>'mileage' IS NULL
    `);
    console.log(`Found ${preview.rows[0].zero_km_count} zero-km records to delete.`);

    const del = await pool.query(`
        DELETE FROM ecodriving_scores
        WHERE (metrics->>'mileage')::numeric = 0
           OR metrics->>'mileage' IS NULL
        RETURNING id
    `);
    console.log(`✓ Deleted ${del.rowCount} zero-km records.`);

    const remaining = await pool.query(`
        SELECT 
            DATE(period_start AT TIME ZONE 'Europe/Sofia') AS day,
            COUNT(*) AS drivers
        FROM ecodriving_scores
        GROUP BY 1 ORDER BY 1 DESC LIMIT 15
    `);
    console.log('\nRemaining records per day (last 15):');
    remaining.rows.forEach((r: any) => console.log(' ', r.day, '|', r.drivers, 'drivers'));

    await pool.end();
}
run().catch(console.error);
