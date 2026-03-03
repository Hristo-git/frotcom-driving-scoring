
import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkTripsForVehicles() {
    const startIso = '2026-02-01T00:00:00Z';
    const endIso = '2026-02-28T23:59:59Z';

    // Vehicles identified from DB lookup
    const vids = [
        315954, 317576, 329231, 343480, 331619,
        327541, 324538, 324532, 327529, 320163
    ];
    const kostadinId = 297309;

    console.log("Checking API driver assignments for the vehicles Kostadin drove...");

    let kostadinTrips = 0;
    let emptyTrips = 0;
    let otherDriverTrips = 0;
    const otherDriverIds = new Set<string>();

    for (const vid of vids) {
        try {
            const token = await FrotcomClient.getAccessToken();
            const qs = new URLSearchParams({
                initial_datetime: startIso,
                final_datetime: endIso,
                api_key: token,
                version: '1'
            });
            const res = await fetch(`https://v2api.frotcom.com/v2/vehicles/${vid}/trips?${qs}`);
            if (!res.ok) continue;
            const text = await res.text();
            if (!text) continue;
            const trips = JSON.parse(text);

            for (const trip of trips) {
                if (trip.driverId === kostadinId) kostadinTrips++;
                else if (!trip.driverId) emptyTrips++;
                else {
                    otherDriverTrips++;
                    otherDriverIds.add(String(trip.driverId));
                }
            }
        } catch (e: any) {
            // suppress
        }
    }

    console.log(`Kostadin driverId (297309): ${kostadinTrips} trips`);
    console.log(`Other driverId: ${otherDriverTrips} trips - IDs: ${Array.from(otherDriverIds).join(', ')}`);
    console.log(`NO driverId (null/undefined): ${emptyTrips} trips`);
}
checkTripsForVehicles();
