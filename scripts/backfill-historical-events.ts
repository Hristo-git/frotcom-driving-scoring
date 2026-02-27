/**
 * Steps 2 + 3: Historical events backfill + enrich ecodriving_scores
 *
 * Step 2: For every vehicle-driver pair, fetch ALL events from 2026-01-01 to today
 *         from the historical-compatible endpoint:
 *         GET /v2/ecodriving/events/{vehicleId}/{driverId}?df=&dt=
 *         Store in ecodriving_events (ON CONFLICT DO NOTHING).
 *
 * Step 3: For each driver, for each day, count events by type and UPDATE
 *         ecodriving_scores metrics JSONB with a new 'eventCounts' key.
 *
 * Run this AFTER cleanup-zero-km.ts
 */
import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE = 'https://v2api.frotcom.com';

// Sofia is UTC+2 in winter (EET)
const SOFIA_OFFSET_HOURS = 2;

function toUtcString(sofiaDate: string, endOfDay = false): string {
    const t = endOfDay ? 'T23:59:59' : 'T00:00:00';
    const d = new Date(`${sofiaDate}${t}+0${SOFIA_OFFSET_HOURS}:00`);
    return d.toISOString().slice(0, 19);
}

async function fetchEvents(vehicleId: number, driverId: number, dfUtc: string, dtUtc: string): Promise<any[]> {
    const token = await FrotcomClient.getAccessToken();
    const qs = new URLSearchParams({ df: dfUtc, dt: dtUtc, api_key: token, version: '1' });
    const url = `${BASE}/v2/ecodriving/events/${vehicleId}/${driverId}?${qs}`;
    const resp = await fetch(url);
    if (!resp.ok) {
        if (resp.status === 404 || resp.status === 400) return [];
        throw new Error(`${resp.status} ${url}`);
    }
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
}

async function run() {
    // ── Step 2: Backfill events Jan 1 → today ──────────────────────────────
    const dfUtc = toUtcString('2026-01-01', false);
    const dtUtc = toUtcString('2026-02-26', true);
    console.log(`\n=== STEP 2: Backfill events ${dfUtc} → ${dtUtc} ===\n`);

    const pairsRes = await pool.query(`
        SELECT DISTINCT
            v.id          AS internal_vehicle_id,
            v.frotcom_id  AS frotcom_vehicle_id,
            v.license_plate,
            d.id          AS internal_driver_id,
            d.frotcom_id  AS frotcom_driver_id,
            d.name        AS driver_name
        FROM vehicles v
        JOIN drivers d ON (v.metadata->>'driverId')::text = d.frotcom_id::text
        WHERE v.frotcom_id IS NOT NULL AND d.frotcom_id IS NOT NULL
    `);
    console.log(`Fetching events for ${pairsRes.rows.length} vehicle-driver pairs...`);

    let totalFetched = 0, totalStored = 0, totalErrors = 0;

    for (let i = 0; i < pairsRes.rows.length; i++) {
        const pair = pairsRes.rows[i];
        const fVid = parseInt(pair.frotcom_vehicle_id);
        const fDid = parseInt(pair.frotcom_driver_id);

        process.stdout.write(`  [${i + 1}/${pairsRes.rows.length}] ${pair.license_plate} / ${pair.driver_name} ... `);

        try {
            const events = await fetchEvents(fVid, fDid, dfUtc, dtUtc);
            totalFetched += events.length;

            for (const ev of events) {
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
                            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
                        ) ON CONFLICT (frotcom_event_id) DO NOTHING
                    `, [
                        ev.id,
                        pair.internal_vehicle_id, pair.internal_driver_id,
                        fVid, fDid,
                        ev.type,
                        ev.started, ev.ended || null, ev.duration ?? null,
                        ev.acceleration ?? null, ev.maxEngineSpeed ?? null,
                        ev.latitudeStart ?? null, ev.longitudeStart ?? null,
                        ev.latitudeEnd ?? null, ev.longitudeEnd ?? null,
                        ev.addressStart || null, ev.addressEnd || null,
                        ev.description || null, ev.alarmType ?? null,
                        null
                    ]);
                    totalStored++;
                } catch (e: any) {
                    if (!e.message?.includes('duplicate')) totalErrors++;
                }
            }
            console.log(`${events.length} events`);
        } catch (e: any) {
            console.log(`ERROR: ${e.message}`);
            totalErrors++;
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
    }

    console.log(`\nStep 2 done: ${totalFetched} fetched, ${totalStored} stored, ${totalErrors} errors.`);

    // ── Step 3: Aggregate event counts → UPDATE ecodriving_scores ──────────
    console.log('\n=== STEP 3: Updating ecodriving_scores with event counts ===\n');

    // Get all driver/day combinations in ecodriving_scores
    const scoresRes = await pool.query(`
        SELECT DISTINCT driver_id,
               DATE((period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') AS day
        FROM ecodriving_scores
    `);
    console.log(`Updating ${scoresRes.rows.length} driver-day combinations...`);

    let updated = 0;
    for (const row of scoresRes.rows) {
        // Aggregate events for this driver on this day (Sofia)
        const aggRes = await pool.query(`
            SELECT
                event_type,
                COUNT(*)                AS count,
                COALESCE(SUM(duration_sec), 0) AS total_sec
            FROM ecodriving_events
            WHERE driver_id = $1
              AND DATE(started_at AT TIME ZONE 'Europe/Sofia') = $2
            GROUP BY event_type
        `, [row.driver_id, row.day]);

        if (aggRes.rows.length === 0) continue;

        // Build eventCounts map
        const eventCounts: Record<string, number> = {};
        const eventDurations: Record<string, number> = {};
        for (const ev of aggRes.rows) {
            eventCounts[ev.event_type] = parseInt(ev.count);
            if (parseInt(ev.total_sec) > 0) {
                eventDurations[ev.event_type] = parseInt(ev.total_sec);
            }
        }

        // Merge into existing metrics
        await pool.query(`
            UPDATE ecodriving_scores
            SET metrics = metrics || jsonb_build_object(
                'eventCounts', $1::jsonb,
                'eventDurations', $2::jsonb
            )
            WHERE driver_id = $3
              AND DATE((period_start AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') = $4
        `, [
            JSON.stringify(eventCounts),
            JSON.stringify(eventDurations),
            row.driver_id,
            row.day
        ]);
        updated++;
    }

    console.log(`✓ Updated ${updated} ecodriving_scores rows with event counts.`);
    await pool.end();
}

run().catch(console.error);
