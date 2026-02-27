import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const API_BASE_URL = 'https://v2api.frotcom.com';

async function getAccessToken() {
    const username = process.env.FROTCOM_USER;
    const password = process.env.FROTCOM_PASS;
    const url = `${API_BASE_URL}/v2/authorize`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, provider: 'thirdparty' }),
    });
    if (!response.ok) throw new Error(`Auth failed: ${response.status}`);
    const data = await response.json();
    return data.token || data.api_key;
}

async function fetchEvents(vehicleId: number, driverId: number, df: string, dt: string, token: string) {
    const qs = new URLSearchParams({
        df,
        dt,
        api_key: token,
        version: '1'
    });
    const url = `${API_BASE_URL}/v2/ecodriving/events/${vehicleId}/${driverId}?${qs}`;
    console.log(`Calling Frotcom API: ${url.replace(token, 'REDACTED')}`);
    const resp = await fetch(url);
    if (!resp.ok) return { status: resp.status, error: resp.statusText };
    const data = await resp.json();
    return { status: resp.status, data };
}

async function debug() {
    try {
        const token = await getAccessToken();
        console.log('Successfully authorized with Frotcom.');

        // 1. Find Denislav
        const driverRes = await pool.query("SELECT id, frotcom_id, name FROM drivers WHERE name ILIKE '%Денислав%Петров%'");
        const denislav = driverRes.rows[0];
        console.log(`Driver: ${denislav.name} (ID: ${denislav.id}, FrotcomID: ${denislav.frotcom_id})`);

        // 2. Find his vehicle on Feb 25
        const vPlate = "CB 1463 XP";
        const vRes = await pool.query("SELECT id, frotcom_id FROM vehicles WHERE license_plate = $1", [vPlate]);
        const vehicle = vRes.rows[0];
        console.log(`Vehicle: ${vPlate} (ID: ${vehicle.id}, FrotcomID: ${vehicle.frotcom_id})`);

        // 3. API Fetch Attempt (Feb 25 Sofia = Feb 24 22:00:00 to Feb 25 21:59:59 UTC)
        const df = '2026-02-24T22:00:00';
        const dt = '2026-02-25T21:59:59';

        console.log(`\nAttempting manual fetch for Denislav on 2026-02-25...`);
        const result = await fetchEvents(parseInt(vehicle.frotcom_id), parseInt(denislav.frotcom_id), df, dt, token);
        console.log(`Status: ${result.status}`);
        if (result.data) {
            console.log(`Fetched ${result.data.length} events from API.`);
            if (result.data.length > 0) {
                console.log('Events returned:', JSON.stringify(result.data, null, 2));
            } else {
                console.log('Frotcom API returned ZERO events for this pair on this date.');
            }
        } else {
            console.log('Error:', result.error);
        }

        // 4. Verify with another driver who HAS events in DB
        console.log(`\nChecking who HAS events on Feb 25 in DB...`);
        const otherRes = await pool.query(`
            SELECT d.name, d.frotcom_id as d_fid, v.frotcom_id as v_fid, count(*) 
            FROM ecodriving_events ee 
            JOIN drivers d ON ee.driver_id = d.id 
            JOIN vehicles v ON ee.vehicle_id = v.id
            WHERE DATE(ee.started_at AT TIME ZONE 'Europe/Sofia') = '2026-02-25' 
            GROUP BY d.name, d.frotcom_id, v_fid 
            ORDER BY count DESC LIMIT 1
        `);

        // 5. Check mapping in vehicles table
        console.log(`\n--- Checking Mapping for Vehicle ${vPlate} ---`);
        const mapRes = await pool.query("SELECT id, frotcom_id, metadata FROM vehicles WHERE license_plate = $1", [vPlate]);
        if (mapRes.rows.length > 0) {
            const v = mapRes.rows[0];
            console.log(`Vehicle ID: ${v.id}, Frotcom ID: ${v.frotcom_id}`);
            console.log('Metadata:', JSON.stringify(v.metadata, null, 2));
            const mappedDriverId = v.metadata?.driverId;
            if (mappedDriverId === denislav.frotcom_id.toString()) {
                console.log('✅ Mapping is CORRECT in the vehicles table.');
            } else {
                console.log(`❌ Mapping is INCORRECT. Currently mapped to: ${mappedDriverId}, Expected: ${denislav.frotcom_id}`);
            }
        } else {
            console.log('Vehicle not found in vehicles table.');
        }
        if (otherRes.rows.length > 0) {
            const other = otherRes.rows[0];
            console.log(`Driver ${other.name} has ${other.count} events in DB.`);
            console.log(`Attempting verification fetch for ${other.name} via API...`);
            const otherResult = await fetchEvents(parseInt(other.v_fid), parseInt(other.d_fid), df, dt, token);
            console.log(`Status: ${otherResult.status}, API returned ${otherResult.data?.length || 0} events.`);
        }

    } catch (e) {
        console.error('Debug failed:', e);
    } finally {
        await pool.end();
    }
}

debug();
