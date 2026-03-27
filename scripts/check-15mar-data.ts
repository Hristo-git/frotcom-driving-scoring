
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
    const targetDate = '2026-03-15';
    
    // In our system, the trip data is either in trips (which didn't exist earlier?)
    // Actually we store daily distance in ecodriving_scores:
    const scoreRes = await pool.query(`
        SELECT 
            driver_id,
            metrics->'vehicles' as vehicles,
            metrics->'mileage' as mileage
        FROM ecodriving_scores
        WHERE period_start = $1
    `, [targetDate]);

    // Also let's get driver names for easier matching with the screenshot
    const driverRes = await pool.query(`SELECT id, name FROM drivers`);
    const dMap: Record<number, string> = {};
    driverRes.rows.forEach(r => dMap[r.id] = r.name);

    console.log(`--- Daily Data for ${targetDate} ---`);
    console.log(`Total records: ${scoreRes.rowCount}`);
    let totalMileage = 0;
    
    // Sort by name for easier visual comparison
    const sortedRows = scoreRes.rows.sort((a, b) => {
        const nameA = dMap[a.driver_id] || 'Unknown';
        const nameB = dMap[b.driver_id] || 'Unknown';
        return nameA.localeCompare(nameB);
    });

    for (const row of sortedRows) {
        const name = dMap[row.driver_id] || 'Unknown';
        const vehicles = row.vehicles || [];
        const mil = parseFloat(row.mileage) || 0;
        
        console.log(`${name.padEnd(35)} | Vehicles: ${(vehicles as string[]).join(', ').padEnd(20)} | Distance: ${mil.toFixed(2)} km`);
        totalMileage += mil;
    }
    
    console.log(`\nTOTAL MILEAGE for all drivers on ${targetDate}: ${totalMileage.toFixed(2)} km`);

    await pool.end();
}

main().catch(console.error);
