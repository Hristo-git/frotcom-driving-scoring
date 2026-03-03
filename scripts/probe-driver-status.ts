
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function probeDriverStatus() {
    const driverId = 297309;

    try {
        const token = await FrotcomClient.getAccessToken();
        const qs = new URLSearchParams({
            api_key: token,
            version: '1'
        });

        // Try /v2/drivers/status/{id}
        const res = await fetch(`https://v2api.frotcom.com/v2/drivers/status/${driverId}?${qs}`);
        console.log(`Status ${driverId}: ${res.status}`);
        if (res.ok) {
            console.log(await res.json());
        }
    } catch (err: any) {
        console.error(err.message);
    }
}
probeDriverStatus();
