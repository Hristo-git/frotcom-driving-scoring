
import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function searchAllTrips() {
    const frotcomDriverId = 297309; // Kostadin
    const startIso = '2026-02-01T00:00:00Z';
    const endIso = '2026-02-28T23:59:59Z';

    try {
        console.log("Fetching all vehicles from DB to scan their Frotcom trips...");
        const res = await pool.query(`SELECT frotcom_id, license_plate FROM vehicles WHERE frotcom_id IS NOT NULL`);
        const vehicles = res.rows;
        console.log(`Scanning trips for ${vehicles.length} vehicles in Frotcom...`);

        let kostadinTripsCount = 0;
        let kostadinDistance = 0;
        let activeVehicles = new Set<string>();

        const token = await FrotcomClient.getAccessToken();
        const qs = new URLSearchParams({
            initial_datetime: startIso,
            final_datetime: endIso,
            api_key: token,
            version: '1'
        });

        for (let i = 0; i < vehicles.length; i++) {
            const v = vehicles[i];
            process.stdout.write(`\r[${i + 1}/${vehicles.length}] Checking ${v.license_plate}...`);
            try {
                const fetchRes = await fetch(`https://v2api.frotcom.com/v2/vehicles/${v.frotcom_id}/trips?${qs}`);
                if (!fetchRes.ok) continue;
                const text = await fetchRes.text();
                if (!text) continue;
                const trips = JSON.parse(text);

                for (const trip of trips) {
                    if (trip.driverId === frotcomDriverId) {
                        kostadinTripsCount++;
                        kostadinDistance += trip.mileage || 0;
                        activeVehicles.add(v.license_plate);
                    }
                }
            } catch (err: any) {
                // Ignore API failures for single vehicles
            }
        }

        console.log(`\n\n=== EXHAUSTIVE FLEET SCAN FOR KOSTADIN (FEB 2026) ===`);
        console.log(`Total Trips: ${kostadinTripsCount}`);
        console.log(`Total Mileage: ${kostadinDistance.toFixed(2)} km`);
        console.log(`Vehicles Driven: ${Array.from(activeVehicles).join(', ')}`);

    } catch (e: any) {
        console.error(e.message);
    } finally {
        await pool.end();
    }
}
searchAllTrips();
