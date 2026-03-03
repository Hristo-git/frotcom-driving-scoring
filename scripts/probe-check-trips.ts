
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function probeCheckTrips() {
    const driverId = 297309; // Kostadin
    const startIso = '2026-02-01T00:00:00Z';
    const endIso = '2026-02-28T23:59:59Z';

    console.log(`Probing /v2/drivers/checkTrips for driver ${driverId} in Feb 2026...`);

    try {
        const token = await FrotcomClient.getAccessToken();
        const qs = new URLSearchParams({
            initial_datetime: startIso,
            final_datetime: endIso,
            api_key: token,
            version: '1'
        });

        const res = await fetch(`https://v2api.frotcom.com/v2/drivers/checkTrips?${qs}`);
        console.log(`Status: ${res.status}`);

        if (res.ok) {
            const data = await res.json();
            console.log('CheckTrips data found:');
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log(await res.text());
        }
    } catch (err: any) {
        console.error(err.message);
    }
}
probeCheckTrips();
