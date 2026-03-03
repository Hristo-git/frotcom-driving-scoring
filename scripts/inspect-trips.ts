
import { FrotcomClient, toFrotcomLocal } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function inspectTrips() {
    const vId = 329231; // CB8568PE
    const date = '2026-03-02';
    const s = `${date}T00:00:00`;
    const e = `${date}T23:59:59`;

    try {
        console.log(`Inspecting trips for Vehicle ${vId} on ${date}...`);
        const trips = await FrotcomClient.request<any[]>(`v2/vehicles/${vId}/trips?initial_datetime=${toFrotcomLocal(s)}&final_datetime=${toFrotcomLocal(e)}`);
        if (trips.length > 0) {
            console.log("First trip keys:", Object.keys(trips[0]));
            console.log("First trip sample:", JSON.stringify(trips[0], null, 2));
        } else {
            console.log("No trips found.");
        }
    } catch (err) {
        console.error(err);
    }
}
inspectTrips();
