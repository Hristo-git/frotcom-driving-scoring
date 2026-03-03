
import { FrotcomClient, toFrotcomLocal } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyNikolaiTripsFixed() {
    const vId = 315954; // CB 3705 TC
    const days = ['01', '02'];

    for (const d of days) {
        const date = `2026-03-${d}`;
        const s = `${date}T00:00:00`;
        const e = `${date}T23:59:59`;

        try {
            console.log(`--- Checking Trips for ${vId} (CB 3705 TC) on ${date} (Using df/dt) ---`);
            const df = toFrotcomLocal(s);
            const dt = toFrotcomLocal(e);

            const trips = await FrotcomClient.request<any[]>(`v2/vehicles/${vId}/trips?df=${encodeURIComponent(df)}&dt=${encodeURIComponent(dt)}`);
            console.log(`  Found ${trips.length} trips.`);
            let total = 0;
            for (const t of trips) {
                console.log(`    Trip ${t.id}: Started ${t.started}, Driver ${t.driverId}, Mileage ${t.mileage}km`);
                total += (t.mileage || 0);
            }
            console.log(`  TRIP_TOTAL: ${total.toFixed(2)}km`);
        } catch (err) {
            console.error(err);
        }
    }
}
verifyNikolaiTripsFixed();
