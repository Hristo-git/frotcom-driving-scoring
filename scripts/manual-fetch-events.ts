import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function manualFetch() {
    const fVehicleId = 324535;
    const fDriverId = 285798;
    const dfUtc = '2026-02-26T22:00:00';
    const dtUtc = '2026-02-27T21:59:59';

    try {
        const token = await FrotcomClient.getAccessToken();
        const BASE = 'https://v2api.frotcom.com';
        const qs = new URLSearchParams({
            df: dfUtc,
            dt: dtUtc,
            api_key: token,
            version: '1'
        });
        const url = `${BASE}/v2/ecodriving/events/${fVehicleId}/${fDriverId}?${qs}`;
        console.log(`Fetching: ${url}`);

        const resp = await fetch(url);
        console.log(`Status: ${resp.status}`);
        if (!resp.ok) {
            console.log(await resp.text());
            return;
        }
        const data = await resp.json();
        console.log(`Events found: ${data.length}`);
        if (data.length > 0) {
            console.log('Sample event:', JSON.stringify(data[0], null, 2));
        }
    } catch (err) {
        console.error(err);
    }
}
manualFetch();
