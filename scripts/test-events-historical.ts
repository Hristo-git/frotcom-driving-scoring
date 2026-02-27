/**
 * Now that we know /v2/ecodriving/events/{vid}/{did} is the correct path,
 * test it with df/dt historical date params.
 */
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BASE = 'https://v2api.frotcom.com';
const VID = 320225; // CB1783ME
const DID = 308019; // Живко

async function rawGet(endpoint: string, params?: Record<string, string>) {
    const token = await FrotcomClient.getAccessToken();
    const qs = new URLSearchParams({ api_key: token, version: '1', ...(params || {}) });
    const url = `${BASE}/${endpoint}?${qs.toString()}`;
    const resp = await fetch(url);
    const body = await resp.json().catch(() => null);
    return { status: resp.status, body, url };
}

async function run() {
    console.log('='.repeat(70));
    console.log('  EVENTS ENDPOINT — HISTORICAL DATE TEST');
    console.log('='.repeat(70));

    // Feb 14 UTC window (Sofia EET = UTC+2)
    const D14_DF = '2026-02-13T22:00:00'; // 00:00 Sofia
    const D14_DT = '2026-02-14T21:59:59'; // 23:59 Sofia

    // Feb 25 UTC window
    const D25_DF = '2026-02-24T22:00:00';
    const D25_DT = '2026-02-25T21:59:59';

    // Today (Feb 26)
    const D26_DF = '2026-02-25T22:00:00';
    const D26_DT = '2026-02-26T21:59:59';

    // ─── 1. No date params (last 4 hours) ─────────────────────────────────────
    console.log('\n[1] No date params (last 4h — default):');
    const r0 = await rawGet(`v2/ecodriving/events/${VID}/${DID}`);
    if (Array.isArray(r0.body)) {
        console.log(`  ${r0.body.length} events`);
        if (r0.body.length > 0) {
            console.log(`  First started: ${r0.body[0].started}`);
            console.log(`  Last started:  ${r0.body[r0.body.length - 1].started}`);
            console.log('  Types:', [...new Set(r0.body.map((e: any) => e.type))].join(', '));
        }
    } else console.log('  Response:', JSON.stringify(r0.body).slice(0, 200));

    // ─── 2. Feb 14 with df/dt ──────────────────────────────────────────────────
    console.log('\n[2] Feb 14 (df/dt):');
    const r14 = await rawGet(`v2/ecodriving/events/${VID}/${DID}`, { df: D14_DF, dt: D14_DT });
    if (Array.isArray(r14.body)) {
        console.log(`  ${r14.body.length} events`);
        if (r14.body.length > 0) {
            console.log(`  First started: ${r14.body[0].started}`);
            console.log(`  Last started:  ${r14.body[r14.body.length - 1].started}`);
            console.log('  Types:', [...new Set(r14.body.map((e: any) => e.type))].join(', '));
            // Show full data for first event
            console.log('\n  Full sample event:');
            console.log(JSON.stringify(r14.body[0], null, 2));
        }
    } else console.log('  Response:', JSON.stringify(r14.body).slice(0, 200));

    // ─── 3. Feb 25 ────────────────────────────────────────────────────────────
    console.log('\n[3] Feb 25 (df/dt):');
    const r25 = await rawGet(`v2/ecodriving/events/${VID}/${DID}`, { df: D25_DF, dt: D25_DT });
    if (Array.isArray(r25.body)) {
        console.log(`  ${r25.body.length} events`);
        if (r25.body.length > 0) console.log(`  First started: ${r25.body[0].started}`);
    } else console.log('  Response:', JSON.stringify(r25.body).slice(0, 200));

    // ─── 4. Today Feb 26 ──────────────────────────────────────────────────────
    console.log('\n[4] Today Feb 26 (df/dt):');
    const r26 = await rawGet(`v2/ecodriving/events/${VID}/${DID}`, { df: D26_DF, dt: D26_DT });
    if (Array.isArray(r26.body)) {
        console.log(`  ${r26.body.length} events`);
        if (r26.body.length > 0) console.log(`  First started: ${r26.body[0].started}`);
    } else console.log('  Response:', JSON.stringify(r26.body).slice(0, 200));

    // ─── Verdict ──────────────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(70));
    const allCounts = [
        Array.isArray(r14.body) ? r14.body.length : -1,
        Array.isArray(r25.body) ? r25.body.length : -1,
        Array.isArray(r26.body) ? r26.body.length : -1,
    ];
    const allDiffer = new Set(allCounts).size > 1;
    if (allDiffer) {
        console.log('✅ EVENT COUNTS DIFFER! Historical date filtering WORKS!');
        console.log(`   Feb 14: ${allCounts[0]}, Feb 25: ${allCounts[1]}, Feb 26: ${allCounts[2]}`);
    } else {
        console.log('❌ Same event count across all dates — still ignoring date params.');
    }
    console.log('='.repeat(70));
}

run().catch(console.error);
