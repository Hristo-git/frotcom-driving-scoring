
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function main() {
    const driverId = 362; // Goran

    // 1. Fetch distances per vehicle from ecodriving_scores
    const scoreRes = await pool.query(`
        SELECT 
            period_start,
            metrics
        FROM ecodriving_scores
        WHERE driver_id = $1
          AND period_start >= '2026-02-01'
          AND period_end <= '2026-03-01'
    `, [driverId]);

    const vehicleData: Record<string, { distance: number, events: any }> = {};

    scoreRes.rows.forEach(row => {
        const vehicles: string[] = Array.isArray(row.metrics.vehicles) ? row.metrics.vehicles : [];
        const distance = parseFloat(row.metrics.mileage) || 0;

        const v = vehicles[0] || 'Unknown';

        if (!vehicleData[v]) {
            vehicleData[v] = { distance: 0, events: {} };
        }

        vehicleData[v].distance += distance;
    });

    // 2. Fetch events per vehicle
    const eventQuery = `
        SELECT 
            event_type, vehicle_id, COUNT(*) as count
        FROM ecodriving_events
        WHERE driver_id = $1
          AND DATE((started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') >= '2026-02-01'
          AND DATE((started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') <= '2026-02-28'
        GROUP BY event_type, vehicle_id
    `;
    const eventRes = await pool.query(eventQuery, [driverId]);

    // We need to map vehicle_id (integer) to license plate, or 
    // just output the raw numbers and see. Let's get vehicle names.
    const vehicleNameQuery = `SELECT id, license_plate FROM vehicles`;
    const vNames = await pool.query(vehicleNameQuery);
    const vMap: Record<number, string> = {};
    vNames.rows.forEach(r => vMap[r.id] = r.license_plate);

    eventRes.rows.forEach(row => {
        const vId = row.vehicle_id;
        const vName = vMap[vId] || 'Unknown';
        if (!vehicleData[vName]) {
            vehicleData[vName] = { distance: 0, events: {} };
        }
        vehicleData[vName].events[row.event_type] = row.count;
    });

    console.log('--- Goran Data per Vehicle ---');
    for (const [v, data] of Object.entries(vehicleData)) {
        console.log(`Vehicle: ${v}, Distance: ${data.distance.toFixed(2)} km`);
        const dist100 = data.distance / 100;
        if (dist100 > 0) {
            for (const [k, val] of Object.entries(data.events)) {
                console.log(`  ${k}: ${val} (total) -> ${(Number(val) / dist100).toFixed(2)} / 100km`);
            }
        }
        console.log('');
    }

    await pool.end();
}

main().catch(console.error);
