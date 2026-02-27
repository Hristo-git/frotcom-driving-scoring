/**
 * lib/ecodriving-events.ts
 * 
 * Fetches and stores granular driving behavior events from
 *   GET /v2/ecodriving/events/{vehicleId}/{driverId}?df=&dt=
 * 
 * This endpoint:
 *  - SUPPORTS historical date filtering via df/dt (UTC) parameters  ✅
 *  - Returns individual events: harshBraking, harshAcceleration, idling,
 *    lateralAcceleration etc. with timestamps, GPS coordinates, acceleration
 * 
 * Event types observed:
 *   lowSpeedBreak, highSpeedBreak,
 *   lowSpeedAcceleration, highSpeedAcceleration,
 *   lateralAcceleration, idling
 */
import { FrotcomClient } from './frotcom';
import pool from './db';

const BASE = 'https://v2api.frotcom.com';

interface FrotcomEvent {
    id: number;
    vehicleId: number;
    driverId: number;
    type: string;
    started: string;
    ended?: string;
    duration?: number;
    acceleration?: number;
    maxEngineSpeed?: number;
    latitudeStart?: number;
    longitudeStart?: number;
    latitudeEnd?: number;
    longitudeEnd?: number;
    addressStart?: string;
    addressEnd?: string;
    placeNameStart?: string;
    placeNameEnd?: string;
    description?: string;
    alarmType?: number;
    occurrenceDetails?: string;
    snapshotsJson?: string;
    snapshots?: any[];
}

async function fetchEvents(vehicleId: number, driverId: number, dfUtc: string, dtUtc: string): Promise<FrotcomEvent[]> {
    const token = await FrotcomClient.getAccessToken();
    const qs = new URLSearchParams({
        df: dfUtc,
        dt: dtUtc,
        api_key: token,
        version: '1'
    });
    const url = `${BASE}/v2/ecodriving/events/${vehicleId}/${driverId}?${qs}`;
    const resp = await fetch(url);
    if (!resp.ok) {
        if (resp.status === 404) return []; // no events for this pair
        throw new Error(`Event fetch error: ${resp.status} ${resp.statusText}`);
    }
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
}

/**
 * Convert a Sofia-local ISO string (e.g. '2026-02-14T00:00:00') to UTC string for the API.
 * Sofia = EET = UTC+2 in Feb.
 */
function sofiaToUtc(sofiaDatetime: string): string {
    // If it already has a UTC offset, strip and convert
    if (sofiaDatetime.includes('+') || sofiaDatetime.endsWith('Z')) {
        return new Date(sofiaDatetime).toISOString().slice(0, 19);
    }
    // Assume EET = UTC+2 in winter (Nov–Mar)
    const d = new Date(sofiaDatetime + '+02:00');
    return d.toISOString().slice(0, 19);
}

export async function fetchAndStoreEcodrivingEvents(
    startSofia: string,
    endSofia: string
): Promise<{ fetched: number; stored: number; errors: number }> {

    const dfUtc = sofiaToUtc(startSofia);
    const dtUtc = sofiaToUtc(endSofia);

    console.log(`Fetching eco events UTC ${dfUtc} → ${dtUtc}`);

    // Get all vehicle→driver mappings that actually drove in this period:
    // We query ecodriving_scores to find which vehicles were used by which drivers.
    const pairsRes = await pool.query(`
        SELECT DISTINCT
            v.id          AS internal_vehicle_id,
            v.frotcom_id  AS frotcom_vehicle_id,
            v.license_plate,
            d.id          AS internal_driver_id,
            d.frotcom_id  AS frotcom_driver_id
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
        WHERE es.period_start >= ($1::timestamp AT TIME ZONE 'Europe/Sofia') 
          AND es.period_start < ($2::timestamp AT TIME ZONE 'Europe/Sofia')
          AND v.frotcom_id IS NOT NULL
          AND d.frotcom_id IS NOT NULL
    `, [startSofia, endSofia]);

    console.log(`Found ${pairsRes.rows.length} vehicle-driver pairs to fetch events for.`);

    let fetched = 0;
    let stored = 0;
    let errors = 0;

    for (const pair of pairsRes.rows) {
        const fVehicleId = parseInt(pair.frotcom_vehicle_id);
        const fDriverId = parseInt(pair.frotcom_driver_id);

        try {
            const events = await fetchEvents(fVehicleId, fDriverId, dfUtc, dtUtc);
            fetched += events.length;

            for (const ev of events) {
                const extra: Record<string, any> = {};
                if (ev.placeNameStart) extra.placeNameStart = ev.placeNameStart;
                if (ev.placeNameEnd) extra.placeNameEnd = ev.placeNameEnd;
                if (ev.occurrenceDetails) extra.occurrenceDetails = ev.occurrenceDetails;
                if (ev.snapshotsJson) extra.snapshotsJson = ev.snapshotsJson;
                if (ev.snapshots?.length) extra.snapshots = ev.snapshots;

                try {
                    await pool.query(`
                        INSERT INTO ecodriving_events (
                            frotcom_event_id, vehicle_id, driver_id,
                            frotcom_vehicle_id, frotcom_driver_id,
                            event_type, started_at, ended_at, duration_sec,
                            acceleration, max_engine_speed,
                            latitude_start, longitude_start,
                            latitude_end, longitude_end,
                            address_start, address_end,
                            description, alarm_type, extra_data
                        ) VALUES (
                            $1, $2, $3, $4, $5,
                            $6, $7, $8, $9,
                            $10, $11,
                            $12, $13,
                            $14, $15,
                            $16, $17,
                            $18, $19, $20
                        )
                        ON CONFLICT (frotcom_event_id) DO NOTHING
                    `, [
                        ev.id,
                        pair.internal_vehicle_id,
                        pair.internal_driver_id,
                        fVehicleId,
                        fDriverId,
                        ev.type,
                        ev.started,
                        ev.ended || null,
                        ev.duration ?? null,
                        ev.acceleration ?? null,
                        ev.maxEngineSpeed ?? null,
                        ev.latitudeStart ?? null,
                        ev.longitudeStart ?? null,
                        ev.latitudeEnd ?? null,
                        ev.longitudeEnd ?? null,
                        ev.addressStart || null,
                        ev.addressEnd || null,
                        ev.description || null,
                        ev.alarmType ?? null,
                        Object.keys(extra).length > 0 ? JSON.stringify(extra) : null
                    ]);
                    stored++;
                } catch (e: any) {
                    if (!e.message?.includes('duplicate')) {
                        console.warn(`  Failed to insert event ${ev.id}:`, e.message);
                        errors++;
                    }
                }
            }
        } catch (e: any) {
            console.warn(`  Error fetching events for vehicle ${fVehicleId} / driver ${fDriverId}:`, e.message);
            errors++;
        }
    }

    return { fetched, stored, errors };
}
