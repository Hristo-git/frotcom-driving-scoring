
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkUnidentified() {
    console.log("Checking ALL Unidentified trips for period Mar 1 - Mar 15...");
    const res = await pool.query(`
        SELECT 
            period_start,
            overall_score,
            metrics->>'mileage' as mileage,
            metrics->'vehicles' as vehicles
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE d.name = 'Неразпознат шофьор'
        AND period_start >= '2026-03-01' 
        AND period_start < '2026-03-16'
        ORDER BY period_start ASC
    `);
    
    if (res.rows.length === 0) {
        console.log("No unidentified trips found for this period.");
    } else {
        console.table(res.rows.map(r => ({
            date: r.period_start.toISOString().split('T')[0],
            score: r.overall_score,
            mileage: parseFloat(r.mileage).toFixed(1),
            vehicles: r.vehicles ? r.vehicles.join(', ') : ''
        })));
        
        let totalUnidentified = res.rows.reduce((acc, r) => acc + parseFloat(r.mileage), 0);
        console.log(`\nTotal Unidentified Mileage: ${totalUnidentified.toFixed(2)} km`);
    }
}

checkUnidentified().then(() => pool.end()).catch(console.error);
