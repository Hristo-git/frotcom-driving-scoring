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
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username,
            password,
            provider: 'thirdparty',
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Frotcom Authorization Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
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

function toUtc(dateStr: string, endOfDay = false) {
    const t = endOfDay ? 'T23:59:59' : 'T00:00:00';
    // Sofia is UTC+2
    const d = new Date(`${dateStr}${t}+02:00`);
    return d.toISOString().slice(0, 19);
}

async function refetch() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: npx ts-node scripts/refetch-events-for-period.ts YYYY-MM-DD YYYY-MM-DD');
        process.exit(1);
    }

    const start = args[0];
    const end = args[1];
    const dfUtc = toUtc(start, false);
    const dtUtc = toUtc(end, true);

    const token = await getAccessToken();

    console.log(`\n=== Refetching Events for ${start} to ${end} ===`);

    // 1. Find pairs from ecodriving_scores
    const pairsRes = await pool.query(`
        SELECT DISTINCT
            v.id          AS internal_vehicle_id,
            v.frotcom_id  AS frotcom_vehicle_id,
            v.license_plate,
            d.id          AS internal_driver_id,
            d.frotcom_id  AS frotcom_driver_id,
            d.name        AS driver_name
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        JOIN vehicles v ON v.license_plate = ANY(
            ARRAY(
                SELECT jsonb_array_elements_text(CASE 
                    WHEN jsonb_typeof(es.metrics->'vehicles') = 'array' THEN es.metrics->'vehicles'
                    ELSE '[]'::jsonb 
                END)
            )
        )
        WHERE DATE(es.period_start AT TIME ZONE 'Europe/Sofia') >= $1
          AND DATE(es.period_start AT TIME ZONE 'Europe/Sofia') <= $2
    `, [start, end]);

    console.log(`Found ${pairsRes.rows.length} pairs.`);

    for (const pair of pairsRes.rows) {
        process.stdout.write(`  ${pair.license_plate} / ${pair.driver_name} ... `);
        const events = await fetchEvents(pair.frotcom_vehicle_id, pair.frotcom_driver_id, dfUtc, dtUtc, token);

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
                ev.id, pair.internal_vehicle_id, pair.internal_driver_id,
                pair.frotcom_vehicle_id, pair.frotcom_driver_id,
                ev.type, ev.started, ev.ended, ev.duration,
                ev.acceleration, ev.maxEngineSpeed,
                ev.latitudeStart, ev.longitudeStart,
                ev.latitudeEnd, ev.longitudeEnd,
                ev.addressStart, ev.addressEnd
            ]);
        }
        console.log(`${events.length} events.`);
    }

    console.log(`\n=== Updating Event Counts in Scores ===`);
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
                WHERE DATE(started_at AT TIME ZONE 'Europe/Sofia') >= $1
                  AND DATE(started_at AT TIME ZONE 'Europe/Sofia') <= $2
                GROUP BY driver_id, edate, event_type
            ) sub
            GROUP BY driver_id, event_date
        )
        UPDATE ecodriving_scores es
        SET metrics = es.metrics || jsonb_build_object('eventCounts', ea.event_counts)
        FROM event_agg ea
        WHERE es.driver_id = ea.driver_id
          AND DATE(es.period_start AT TIME ZONE 'Europe/Sofia') = ea.event_date
    `, [start, end]);

    console.log('Done.');
    await pool.end();
}

refetch().catch(console.error);
