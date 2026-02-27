/**
 * Test GET /v2/eco/driving/events/{vehicleId}/{driverId}
 * 
 * Key differences from the /ecodriving/calculate endpoint:
 *  - Uses df/dt parameters (UTC) instead of from_datetime/to_datetime
 *  - Returns individual driving events with type, duration, coordinates etc.
 *  - Actually documented on the Frotcom API docs page!
 *
 * Test: Compare Feb 14 vs Feb 26 (today) to check if historical data works.
 */
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const VID = 320225; // CB1783ME — Живко's vehicle
const DID = 308019; // Живко's driver ID

// Feb 14 full day in UTC (EET = UTC+2, so 00:00 Sofia = 22:00 UTC Feb 13)
const FEB14_DF = '2026-02-13T22:00:00';  // 00:00 Sofia in UTC
const FEB14_DT = '2026-02-14T21:59:59';  // 23:59 Sofia in UTC

// Today full day in UTC
const TODAY_DF = '2026-02-25T22:00:00';  // 00:00 Sofia Feb 26 in UTC
const TODAY_DT = '2026-02-26T21:59:59';  // 23:59 Sofia Feb 26 in UTC

async function fetchEvents(vehicleId: number, driverId: number, df: string, dt: string) {
    const token = await FrotcomClient.getAccessToken();

    // Try with df/dt in query string
    const url = `https://v2api.frotcom.com/v2/eco/driving/events/${vehicleId}/${driverId}?df=${encodeURIComponent(df)}&dt=${encodeURIComponent(dt)}&api_key=${token}&version=1`;

    const resp = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!resp.ok) {
        return { error: `${resp.status} ${resp.statusText}`, url };
    }
    return resp.json();
}

async function run() {
    console.log('='.repeat(70));
    console.log('  TEST: GET /v2/eco/driving/events (df/dt UTC params)');
    console.log('='.repeat(70));

    // ─── 1. Today's events ───────────────────────────────────────────────────
    console.log('\n[1] TODAY (Feb 26) events for Живко + CB1783ME:');
    const todayResult = await fetchEvents(VID, DID, TODAY_DF, TODAY_DT);
    if (todayResult.error) {
        console.log('Error:', todayResult.error);
    } else if (Array.isArray(todayResult)) {
        console.log(`  ${todayResult.length} events returned.`);
        if (todayResult.length > 0) {
            console.log('  Event types today:', [...new Set(todayResult.map((e: any) => e.type))].join(', '));
            console.log('  First event:', JSON.stringify(todayResult[0], null, 2).slice(0, 500));
        }
    } else {
        console.log('  Response:', JSON.stringify(todayResult, null, 2).slice(0, 500));
    }

    // ─── 2. Feb 14 events ────────────────────────────────────────────────────
    console.log('\n[2] FEB 14 events for Живко + CB1783ME (HISTORICAL TEST):');
    const feb14Result = await fetchEvents(VID, DID, FEB14_DF, FEB14_DT);
    if (feb14Result.error) {
        console.log('Error:', feb14Result.error);
    } else if (Array.isArray(feb14Result)) {
        console.log(`  ${feb14Result.length} events returned.`);
        if (feb14Result.length > 0) {
            console.log('  Event types Feb 14:', [...new Set(feb14Result.map((e: any) => e.type))].join(', '));
            console.log('  Sample event started:', feb14Result[0].started);
            console.log('  First event:', JSON.stringify(feb14Result[0], null, 2).slice(0, 500));
        }
    } else {
        console.log('  Response:', JSON.stringify(feb14Result, null, 2).slice(0, 500));
    }

    // ─── 3. Compare: are results different? ──────────────────────────────────
    if (Array.isArray(todayResult) && Array.isArray(feb14Result)) {
        const todayCount = todayResult.length;
        const feb14Count = feb14Result.length;
        const differ = todayCount !== feb14Count;

        console.log('\n' + '='.repeat(70));
        if (differ) {
            console.log(`✅ DIFFERENT RESULTS! Today: ${todayCount} events, Feb 14: ${feb14Count} events`);
            console.log('   This endpoint SUPPORTS historical data via df/dt params!');
        } else if (todayCount === 0 && feb14Count === 0) {
            console.log('⚠️  Both returned 0 events. Possibly low mileage day or driver ID issue.');
        } else {
            console.log(`❌ Same count (${todayCount}) — may still be ignoring dates, check the event timestamps.`);
            if (todayResult.length > 0 && feb14Result.length > 0) {
                console.log('   Today first event started:', todayResult[0].started);
                console.log('   Feb14 first event started:', feb14Result[0].started);
            }
        }
        console.log('='.repeat(70));
    }

    // ─── 4. Try with driverId=0 (unidentified trips) ─────────────────────────
    console.log('\n[3] FEB 14 with driverId=0 (any driver on vehicle):');
    const feb14Any = await fetchEvents(VID, 0, FEB14_DF, FEB14_DT);
    if (Array.isArray(feb14Any)) {
        console.log(`  ${feb14Any.length} events (driverId=0).`);
        if (feb14Any.length > 0) console.log('  First started:', feb14Any[0].started);
    } else {
        console.log('  Response:', JSON.stringify(feb14Any).slice(0, 200));
    }
}

run().catch(console.error);
