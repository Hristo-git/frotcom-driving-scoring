
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findMissingKm() {
    const res = await pool.query("SELECT id FROM drivers WHERE name ILIKE '%Иван Илиев%'");
    const ivanId = res.rows[0].id;

    console.log("Checking all trips for period Mar 1 - Mar 15...");
    const allTrips = await pool.query(`
        SELECT 
            period_start,
            d.name as driver_name,
            metrics->>'mileage' as mileage,
            metrics->'vehicles' as vehicles,
            overall_score
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE period_start >= '2026-03-01' AND period_start < '2026-03-16'
        ORDER BY period_start ASC
    `);

    console.log("\nTrips Breakdown:");
    console.table(allTrips.rows.map(r => ({
        date: r.period_start.toISOString().split('T')[0],
        driver: r.driver_name,
        mileage: parseFloat(r.mileage).toFixed(1),
        vehicles: r.vehicles ? r.vehicles.join(', ') : '',
        score: r.overall_score
    })));

    // Specifically look for vehicles Ivan drove
    const ivanVehicles = ['BKX7131', 'CB6311CE', 'CB6820HE'];
    console.log("\nChecking for trips with Ivan's vehicles assigned to others or unidentified:");
    
    const otherTrips = await pool.query(`
        SELECT 
            period_start,
            d.name as driver_name,
            metrics->>'mileage' as mileage,
            metrics->'vehicles' as vehicles,
            overall_score
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE period_start >= '2026-03-01' AND period_start < '2026-03-16'
        AND EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(es.metrics->'vehicles') v
            WHERE v = ANY($1)
        )
        AND driver_id != $2
    `, [ivanVehicles, ivanId]);
    
    console.table(otherTrips.rows.map(r => ({
        date: r.period_start.toISOString().split('T')[0],
        driver: r.driver_name,
        mileage: parseFloat(r.mileage).toFixed(1),
        vehicles: r.vehicles ? r.vehicles.join(', ') : '',
        score: r.overall_score
    })));
}

findMissingKm().then(() => pool.end()).catch(console.error);
