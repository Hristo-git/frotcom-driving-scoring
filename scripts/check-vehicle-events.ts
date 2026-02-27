
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const BASE = 'https://v2api.frotcom.com';

async function getAccessToken() {
    const username = process.env.FROTCOM_USER;
    const password = process.env.FROTCOM_PASS;
    const url = `${BASE}/v2/authorize`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, provider: 'thirdparty' })
    });
    const data = await resp.json();
    return data.token || data.api_key;
}

async function fetchVehicleEvents(vehicleId: number, df: string, dt: string, token: string) {
    const qs = new URLSearchParams({ df, dt, api_key: token, version: '1' });
    // Note: No driverId in the URL path for some endpoints, but for ecodriving/events it says it's required?
    // Let's check if there is an endpoint for just vehicle.
    const url = `${BASE}/v2/ecodriving/events/${vehicleId}?${qs}`;
    const resp = await fetch(url);
    if (!resp.ok) {
        console.log(`Failed with status ${resp.status}`);
        return [];
    }
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
}

async function run() {
    const token = await getAccessToken();
    const vehicleId = 352015; // CB4967KO
    const df = '2026-02-23T22:00:00';
    const dt = '2026-02-24T22:00:00';

    console.log(`Fetching all events for vehicle ${vehicleId} from ${df} to ${dt}`);
    const events = await fetchVehicleEvents(vehicleId, df, dt, token);
    console.log(`Found ${events.length} events.`);
    if (events.length > 0) {
        const driverIds = Array.from(new Set(events.map(e => e.driverId)));
        console.log('Driver IDs found in events:', driverIds);
        console.table(events.slice(0, 5));
    }
}

run().catch(console.error);
