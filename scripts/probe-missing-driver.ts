
import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

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

async function fetchEvents(vehicleId: string, driverId: string, dfUtc: string, dtUtc: string, token: string, version: string) {
    const qs = new URLSearchParams({ df: dfUtc, dt: dtUtc, api_key: token });
    if (version) qs.append('version', version);
    const url = `${BASE}/v2/ecodriving/events/${vehicleId}/${driverId}?${qs}`;
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
}

async function run() {
    const token = await getAccessToken();

    // Top missing driver: Yordan Angelov - Русе
    // I need to find his frotcom_id and vehicle frotcom_id
    const driverRes = await pool.query("SELECT frotcom_id FROM drivers WHERE name ILIKE '%Yordan Angelov%'");
    if (driverRes.rows.length === 0) { console.log('Driver not found'); return; }
    // const driverRes = await pool.query("SELECT frotcom_id FROM drivers WHERE name ILIKE '%Yordan Angelov%'");
    // if (driverRes.rows.length === 0) { console.log('Driver not found'); return; }
    // const driverFId = driverRes.rows[0].frotcom_id;

    const vehicleRes = await pool.query("SELECT frotcom_id, license_plate FROM vehicles WHERE license_plate = 'СВ6234РЕ'");
    if (vehicleRes.rows.length === 0) { console.log('Vehicle not found'); return; }
    const vehicleFId = vehicleRes.rows[0].frotcom_id;

    console.log(`Checking events for Driver 0 in vehicle ${vehicleFId} (СВ6234РЕ)`);

    const df = '2026-02-25T22:00:00';
    const dt = '2026-02-26T22:00:00';

    const driverFId = '336635';
    const events = await fetchEvents(vehicleFId, driverFId, df, dt, token, '1');
    console.log(`Version 1: Found ${events.length} events for Driver ${driverFId} on Feb 26 (Sofia).`);

    await pool.end();
}

run().catch(console.error);
