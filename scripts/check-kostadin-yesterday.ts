
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function findKostadinYesterday() {
    const driverId = 297309;
    const date = '2026-03-02';
    const start = `${date}T00:00:00Z`;
    const end = `${date}T23:59:59Z`;

    try {
        console.log(`Checking events for Kostadin on ${date}...`);
        const token = await FrotcomClient.getAccessToken();

        // Find which vehicles he drove by looking at events
        // Note: We don't have an easy way to get "all vehicles for driver" other than calculate
        const calc = await FrotcomClient.calculateEcodriving(start, end, [driverId], undefined, 'driver');
        console.log("Calculate result for Kostadin:");
        console.log(JSON.stringify(calc, null, 2));

        if (calc.length > 0 && calc[0].vehicles) {
            for (const v of calc[0].vehicles) {
                console.log(`Checking trips for vehicle ${v.licensePlate} (${v.id})...`);
                const trips = await FrotcomClient.getVehicleTrips(v.id, start, end);
                console.log(`Found ${trips.length} trips.`);
                for (const t of trips) {
                    console.log(`Trip ${t.id}: Driver ${t.driverId}, Distance ${t.distance}km`);
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
}
findKostadinYesterday();
