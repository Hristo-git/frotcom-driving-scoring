
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

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

async function fetchEvents(vehicleId: number, driverId: number, dfUtc: string, dtUtc: string, token: string) {
    const qs = new URLSearchParams({ df: dfUtc, dt: dtUtc, api_key: token, version: '1' });
    const url = `${BASE}/v2/ecodriving/events/${vehicleId}/${driverId}?${qs}`;
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
}

function toUtc(dateStr: string, hourStart: number) {
    // Sofia is UTC+2
    const d = new Date(`${dateStr}T${hourStart.toString().padStart(2, '0')}:00:00+02:00`);
    return d.toISOString().slice(0, 19);
}

async function run() {
    const token = await getAccessToken();
    const driverFrotcomId = 298565; // Miroslav
    const vehiclePairs = [
        { id: 352015, plate: 'CB4967KO' },
        { id: 343480, plate: 'CB3095AO' }
    ];

    const days = ['2026-02-24', '2026-02-25'];

    for (const day of days) {
        console.log(`\nChecking events for ${day}:`);
        const df = toUtc(day, 0);
        const dt = toUtc(day, 23); // Actually should be T00:00 of next day
        const dtNext = toUtc(day === '2026-02-24' ? '2026-02-25' : '2026-02-26', 0);

        let dayTotal = 0;
        for (const v of vehiclePairs) {
            const events = await fetchEvents(v.id, driverFrotcomId, df, dtNext, token);
            console.log(`  Vehicle ${v.plate}: ${events.length} events`);
            dayTotal += events.length;
        }
        console.log(`Total for ${day}: ${dayTotal}`);
    }
    await pool.end();
}

run().catch(console.error);
