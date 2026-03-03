
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkEventSchema() {
    const driverId = 297309; // Kostadin
    const vehicleId = 329231; // CB8568PE
    const startIso = '2026-02-01T00:00:00Z';
    const endIso = '2026-02-28T23:59:59Z';

    try {
        const token = await FrotcomClient.getAccessToken();
        const qs = new URLSearchParams({
            df: startIso,
            dt: endIso,
            api_key: token,
            version: '1'
        });

        const res = await fetch(`https://v2api.frotcom.com/v2/ecodriving/events/${vehicleId}/${driverId}?${qs}`);
        if (res.ok) {
            const events = await res.json();
            if (events && events.length > 0) {
                console.log("Sample ecodriving event:");
                console.log(JSON.stringify(events[0], null, 2));
            }
        }
    } catch (err: any) {
        console.error(err.message);
    }
}
checkEventSchema();
