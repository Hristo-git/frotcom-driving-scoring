
import { FrotcomClient, toFrotcomLocal } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkKostadinYesterday() {
    const driverId = 297309;
    const date = '2026-03-02';
    const start = `${date}T00:00:00`;
    const end = `${date}T23:59:59`;

    try {
        console.log(`Checking Kostadin on ${date}...`);

        // 1. Calculate for driver
        const calc = await FrotcomClient.calculateEcodriving(start, end, [driverId], undefined, 'driver');
        console.log("Calculate (driver) result:");
        console.log(JSON.stringify(calc, null, 2));

        // 2. Are there any vehicles mentioned?
        if (calc.length > 0 && calc[0].vehicles) {
            for (const v of calc[0].vehicles) {
                console.log(`\n--- Vehicle: ${v.licensePlate} (${v.id}) ---`);
                // Get trips for this vehicle
                const trips = await FrotcomClient.request<any[]>(`v2/vehicles/${v.id}/trips?initial_datetime=${toFrotcomLocal(start)}&final_datetime=${toFrotcomLocal(end)}`);
                console.log(`Found ${trips.length} trips.`);
                for (const t of trips) {
                    console.log(`Trip ${t.id}: Driver ${t.driverId}, Distance ${t.distance}km, Start: ${t.start_datetime}`);
                }
            }
        } else {
            console.log("No vehicles returned in calculation for Kostadin yesterday.");

            // Try searching events directly to find vehicles
            const token = await FrotcomClient.getAccessToken();
            const eventsRes = await fetch(`https://v2api.frotcom.com/v2/ecodriving/events?df=${start}Z&dt=${end}Z&api_key=${token}&version=1`);
            const allEvents = await eventsRes.json();
            const kEvents = allEvents.filter((e: any) => e.driverId === driverId);
            console.log(`Found ${kEvents.length} events for Kostadin yesterday in ALL events.`);
            const vIds = [...new Set(kEvents.map((e: any) => e.vehicleId))];
            console.log("Vehicles from events:", vIds);

            for (const vId of vIds) {
                console.log(`\n--- Vehicle ID from events: ${vId} ---`);
                const trips = await FrotcomClient.request<any[]>(`v2/vehicles/${vId}/trips?initial_datetime=${toFrotcomLocal(start)}&final_datetime=${toFrotcomLocal(end)}`);
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
checkKostadinYesterday();
