
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function probeDrivingTimesPlural() {
    const startIso = '2026-03-02T00:00:00'; // No Z to check local
    const endIso = '2026-03-02T23:59:59';

    try {
        const token = await FrotcomClient.getAccessToken();
        const qs = new URLSearchParams({
            api_key: token,
            version: '1'
        });

        const res = await fetch(`https://v2api.frotcom.com/v2/drivers/drivingtimes?${qs}`);
        console.log(`Status: ${res.status}`);

        if (res.ok) {
            const data = await res.json();
            console.log(`Found ${data.length} driver status records.`);
            const k = data.find((d: any) => d.driverId === 297309);
            if (k) {
                console.log("Kostadin found in plural drivingtimes:");
                console.log(JSON.stringify(k, null, 2));
            } else {
                console.log("Kostadin not found in plural drivingtimes.");
            }
        } else {
            console.log(await res.text());
        }
    } catch (err: any) {
        console.error(err.message);
    }
}
probeDrivingTimesPlural();
