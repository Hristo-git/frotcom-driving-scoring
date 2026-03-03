
import { FrotcomClient, toFrotcomLocal } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkKostadinYesterdayEvents() {
    const driverId = 297309;
    const date = '2026-03-02';
    const start = `${date}T00:00:00Z`;
    const end = `${date}T23:59:59Z`;

    try {
        console.log(`Checking events for Kostadin on ${date}...`);
        const token = await FrotcomClient.getAccessToken();

        // Fetch ALL events for the day and filter (since we don't know the vehicle)
        const eventsRes = await fetch(`https://v2api.frotcom.com/v2/ecodriving/events?df=${start}&dt=${end}&api_key=${token}&version=1`);
        const allEvents = await eventsRes.json();

        if (!Array.isArray(allEvents)) {
            console.log("No events returned or error:", allEvents);
            return;
        }

        const kEvents = allEvents.filter((e: any) => e.driverId === driverId);
        console.log(`Found ${kEvents.length} events for Kostadin yesterday.`);

        const vIds = [...new Set(kEvents.map((e: any) => e.vehicleId))];
        console.log("Vehicles identified from events:", vIds);

        for (const vId of vIds) {
            console.log(`\n--- Vehicle ID: ${vId} ---`);
            const trips = await FrotcomClient.request<any[]>(`v2/vehicles/${vId}/trips?initial_datetime=${toFrotcomLocal(date + 'T00:00:00')}&final_datetime=${toFrotcomLocal(date + 'T23:59:59')}`);
            console.log(`Found ${trips.length} trips.`);
            for (const t of trips) {
                console.log(`Trip ${t.id}: Driver ${t.driverId}, Distance ${t.distance}km, Start: ${t.start_datetime}`);
            }

            // Also check calculate for this specific vehicle
            const vCalc = await FrotcomClient.calculateEcodriving(date + 'T00:00:00', date + 'T23:59:59', undefined, [Number(vId)], 'driver');
            console.log(`Calculate (grouped by driver) for this vehicle:`);
            const driversForV = vCalc.filter(r => r.mileage > 0);
            for (const d of driversForV) {
                console.log(`  Driver ${d.driverId} (${d.driverName}): ${d.mileage}km`);
            }
        }
    } catch (e) {
        console.error(e);
    }
}
checkKostadinYesterdayEvents();
