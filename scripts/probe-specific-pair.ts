
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkCalculateSpecific() {
    const start = '2026-02-01T00:00:00';
    const end = '2026-02-28T23:59:59';
    const driverId = 297309; // Kostadin
    const vehicleId = 329231; // CB8568PE (has 249 events for him, but wait, screenshot says 389.9km)
    // Wait, let's use CB3094AO which is 331619 (591.0 km in screenshot)
    const vehicleId2 = 331619;

    try {
        console.log(`Fetching calculate API for driver 297309 and vehicle 331619...`);
        const token = await FrotcomClient.getAccessToken();
        const payload = {
            "from_datetime": start,
            "to_datetime": end,
            "driverIds": [driverId],
            "vehicleIds": [vehicleId2],
            "groupBy": "driver"
        };
        const res = await fetch('https://v2api.frotcom.com/v2/ecodriving/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        console.log('Result:', text);
    } catch (err: any) {
        console.error(err.message);
    }
}
checkCalculateSpecific();
