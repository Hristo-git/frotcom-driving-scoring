import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findDenislav() {
    console.log("Searching for records with mileage between 435 and 445...");

    const res = await pool.query(
        `SELECT id, driver_id, overall_score, metrics, period_start 
         FROM ecodriving_scores 
         WHERE (metrics->>'mileage')::numeric BETWEEN 435 AND 445`
    );

    console.log(`Found ${res.rows.length} records with mileage around 440:`);
    res.rows.forEach((row, i) => {
        console.log(`\n--- Record ${i + 1} ---`);
        console.log(`ID: ${row.id}, Driver ID: ${row.driver_id}, Date: ${row.period_start}`);
        console.log(`Score: ${row.overall_score}`);
        console.log(`Driver Name (from metrics): ${row.metrics.driverName || row.metrics.driver_name}`);
        console.log(`Mileage: ${row.metrics.mileage}`);
        console.log(`Event Counts:`, JSON.stringify(row.metrics.eventCounts, null, 2));
    });

    await pool.end();
}

findDenislav().catch(console.error);
