import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function listAll() {
    console.log("Listing all records for 2026-02-25...");
    const res = await pool.query(
        `SELECT id, driver_id, overall_score, metrics 
         FROM ecodriving_scores 
         WHERE DATE(period_start AT TIME ZONE 'Europe/Sofia') = '2026-02-25' 
         ORDER BY (metrics->>'mileage')::numeric DESC`
    );

    console.log(`Found ${res.rows.length} total records.`);
    res.rows.forEach(row => {
        const name = row.metrics.driverName || row.metrics.driver_name;
        const mileage = row.metrics.mileage;
        const score = row.overall_score;
        console.log(`Driver: ${name}, Score: ${score}, Mileage: ${mileage}, ID: ${row.id}, DriverID: ${row.driver_id}`);
    });

    await pool.end();
}

listAll().catch(console.error);
