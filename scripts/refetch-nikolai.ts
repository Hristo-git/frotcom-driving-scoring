
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const BASE = 'https://v2api.frotcom.com';

async function getAccessToken() {
    const username = process.env.FROTCOM_USER;
    const password = process.env.FROTCOM_PASS;
    const url = `${BASE}/v2/authorize`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, provider: 'thirdparty' }),
    });
    const data = await response.json();
    return data.token || data.api_key;
}

async function fetchEvents(vehicleId: number, driverId: number, dfUtc: string, dtUtc: string, token: string) {
    const qs = new URLSearchParams({ df: dfUtc, dt: dtUtc, api_key: token, version: '1' });
    const url = `${BASE}/v2/ecodriving/events/${vehicleId}/${driverId}?${qs}`;
    const resp = await fetch(url);
    if (!resp.ok) {
        console.log(`Failed to fetch events for vehicle ${vehicleId}: ${resp.status}`);
        return [];
    }
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
}

function toUtc(dateStr: string, endOfDay = false) {
    const t = endOfDay ? 'T23:59:59' : 'T00:00:00';
    const d = new Date(`${dateStr}${t}+02:00`);
    return d.toISOString().slice(0, 19);
}

async function refetchNikolai() {
    const start = '2026-03-01';
    const end = '2026-03-15';
    const driverId = 342; // Nikolai
    
    const dfUtc = toUtc(start, false);
    const dtUtc = toUtc(end, true);
    const token = await getAccessToken();

    console.log(`\n=== Refetching Events for Nikolai (ID: ${driverId}) from ${start} to ${end} ===`);

    const vehicles = [
        { id: 214, frotcom_id: 340657, plate: 'СВ6311СЕ' },
        { id: 96,  frotcom_id: 317501, plate: 'СВ6820НЕ' },
        { id: 121, frotcom_id: 320133, plate: 'CB1786ME' }
    ];

    const fdId = 308045; // Nikolai's Frotcom ID

    for (const v of vehicles) {
        process.stdout.write(`  ${v.plate} / Nikolai (FrotcomID: ${fdId}) ... `);
        const events = await fetchEvents(v.frotcom_id, fdId, dfUtc, dtUtc, token);

        for (const ev of events) {
            await pool.query(`
                INSERT INTO ecodriving_events (
                    frotcom_event_id, vehicle_id, driver_id,
                    frotcom_vehicle_id, frotcom_driver_id,
                    event_type, started_at, ended_at, duration_sec,
                    acceleration, max_engine_speed,
                    latitude_start, longitude_start,
                    latitude_end, longitude_end,
                    address_start, address_end
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
                ON CONFLICT (frotcom_event_id) DO NOTHING
            `, [
                ev.id, v.id, driverId,
                v.frotcom_id, fdId,
                ev.type, ev.started, ev.ended, ev.duration,
                ev.acceleration, ev.maxEngineSpeed,
                ev.latitudeStart, ev.longitudeStart,
                ev.latitudeEnd, ev.longitudeEnd,
                ev.addressStart, ev.addressEnd
            ]);
        }
        console.log(`${events.length} events.`);
    }

    console.log(`\n=== Updating Event Counts in Scores for Nikolai ===`);
    await pool.query(`
        WITH event_agg AS (
            SELECT 
                driver_id,
                edate as event_date,
                jsonb_object_agg(event_type, count) as event_counts
            FROM (
                SELECT 
                    driver_id, 
                    DATE(started_at AT TIME ZONE 'Europe/Sofia') as edate, 
                    event_type, 
                    count(*) as count
                FROM ecodriving_events
                WHERE driver_id = $3
                  AND DATE(started_at AT TIME ZONE 'Europe/Sofia') >= $1
                  AND DATE(started_at AT TIME ZONE 'Europe/Sofia') <= $2
                GROUP BY driver_id, edate, event_type
            ) sub
            GROUP BY driver_id, event_date
        )
        UPDATE ecodriving_scores es
        SET metrics = es.metrics || jsonb_build_object('eventCounts', ea.event_counts)
        FROM event_agg ea
        WHERE es.driver_id = ea.driver_id
          AND es.driver_id = $3
          AND DATE(es.period_start AT TIME ZONE 'Europe/Sofia') = ea.event_date
    `, [start, end, driverId]);

    console.log('Done.');
    await pool.end();
}

refetchNikolai().catch(console.error);
