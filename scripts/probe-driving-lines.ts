
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function probeDrivingLines() {
    const driverId = 297309; // Kostadin
    const startIso = '2026-03-02T00:00:00Z'; // Yesterday
    const endIso = '2026-03-02T23:59:59Z';

    console.log(`Probing /v2/drivers/drivinglines/${driverId} for Mar 2nd 2026...`);

    try {
        const token = await FrotcomClient.getAccessToken();
        const qs = new URLSearchParams({
            initial_datetime: startIso,
            final_datetime: endIso,
            api_key: token,
            version: '1'
        });

        // /v2/drivers/drivinglines/{id}
        const res = await fetch(`https://v2api.frotcom.com/v2/drivers/drivinglines/${driverId}?${qs}`);
        console.log(`Status: ${res.status}`);

        if (res.ok) {
            const data = await res.json();
            console.log('Driving lines found:');
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log(await res.text());
        }
    } catch (err: any) {
        console.error(err.message);
    }
}
probeDrivingLines();
