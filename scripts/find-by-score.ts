import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findByScore() {
    console.log("Searching for records with score around 3.91 on 2026-02-25...");

    const res = await pool.query(
        `SELECT id, driver_id, overall_score, metrics 
         FROM ecodriving_scores 
         WHERE DATE(period_start AT TIME ZONE 'Europe/Sofia') = '2026-02-25' 
         AND (overall_score BETWEEN 3.90 AND 3.92 OR (metrics->>'score')::numeric BETWEEN 3.90 AND 3.92)`
    );

    console.log(`Found ${res.rows.length} total records:`);
    res.rows.forEach((row, i) => {
        console.log(`\n--- Record ${i + 1} ---`);
        console.log(`ID: ${row.id}, Driver ID: ${row.driver_id}, Score: ${row.overall_score}`);
        console.log(`Driver Name (from metrics): ${row.metrics.driverName || row.metrics.driver_name}`);
        console.log(`Mileage: ${row.metrics.mileage}`);
        console.log(`Event Counts:`, JSON.stringify(row.metrics.eventCounts, null, 2));
    });

    await pool.end();
}

findByScore().catch(console.error);
