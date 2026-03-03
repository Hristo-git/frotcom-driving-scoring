
import { FrotcomClient, toFrotcomLocal } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyNikolaiTrips() {
    const vId = 315954; // CB 3705 TC (from previous step)
    const days = ['01', '02'];

    for (const d of days) {
        const date = `2026-03-${d}`;
        const s = `${date}T00:00:00`;
        const e = `${date}T23:59:59`;

        try {
            console.log(`--- Checking Trips for Vehicle ${vId} on ${date} ---`);
            const trips = await FrotcomClient.request<any[]>(`v2/vehicles/${vId}/trips?initial_datetime=${toFrotcomLocal(s)}&final_datetime=${toFrotcomLocal(e)}`);
            console.log(`  Found ${trips.length} trips.`);
            let total = 0;
            for (const t of trips) {
                console.log(`    Trip ${t.id}: Driver ${t.driverId}, Dist ${t.distance}km`);
                total += t.distance;
            }
            console.log(`  TRIP_TOTAL: ${total}km`);
        } catch (err) {
            console.error(err);
        }
    }
}
verifyNikolaiTrips();
