/**
 * Try all possible path variations of the ecodriving events endpoint
 * with df/dt params, and also scan the full fleet (all vehicle IDs).
 */
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function rawGet(url: string): Promise<{ status: number, body: any }> {
    const token = await FrotcomClient.getAccessToken();
    const sep = url.includes('?') ? '&' : '?';
    const fullUrl = `${url}${sep}api_key=${token}&version=1`;
    const resp = await fetch(fullUrl);
    let body: any;
    try { body = await resp.json(); } catch { body = null; }
    return { status: resp.status, body };
}

async function run() {
    // Current 4-hour window (the API default is last 4 hours before dt)
    // Try both omitting df (defaults to 4h ago) and explicit
    const FEB14_DF = '2026-02-13T22:00:00'; // 00:00 Sofia
    const FEB14_DT = '2026-02-14T21:59:59'; // 23:59 Sofia
    const PARAMS14 = `df=${encodeURIComponent(FEB14_DF)}&dt=${encodeURIComponent(FEB14_DT)}`;

    const BASE = 'https://v2api.frotcom.com';
    const VID = 320225;
    const DID = 308019;

    // ─── Path variations ─────────────────────────────────────────────────────
    const paths = [
        // The URL from the Frotcom docs page
        `${BASE}/v2/eco/driving/events/${VID}/${DID}?${PARAMS14}`,
        `${BASE}/v2/ecodriving/events/${VID}/${DID}?${PARAMS14}`,
        // Without driverId
        `${BASE}/v2/eco/driving/events/${VID}/0?${PARAMS14}`,
        `${BASE}/v2/ecodriving/events/${VID}/0?${PARAMS14}`,
        // Without date params
        `${BASE}/v2/eco/driving/events/${VID}/${DID}`,
        `${BASE}/v2/ecodriving/events/${VID}/${DID}`,
        // Alternate formats
        `${BASE}/v2/eco/driving/${VID}/${DID}?${PARAMS14}`,
        `${BASE}/v2/ecoDriving/events/${VID}/${DID}?${PARAMS14}`,
    ];

    console.log('=== Testing path variations ===\n');
    for (const p of paths) {
        const { status, body } = await rawGet(p);
        const short = p.replace(BASE, '').split('?')[0];
        const isArray = Array.isArray(body);
        const preview = isArray
            ? `${body.length} events`
            : (body ? JSON.stringify(body).slice(0, 80) : 'null/empty');
        const ok = status === 200 ? '✅' : `❌ ${status}`;
        console.log(`${ok} ${short} → ${preview}`);
    }

    // ─── Scan several vehicles for today without date ─────────────────────────
    console.log('\n=== Scanning vehicles for live events (last 4h) ===\n');
    const vehicles = await FrotcomClient.request<any[]>('v2/vehicles');
    let found = 0;
    for (const v of vehicles.slice(0, 20)) {
        const id = v.id;
        try {
            // Try both path variants
            for (const ep of [`v2/ecodriving/events/${id}/0`, `v2/eco/driving/events/${id}/0`]) {
                const { status, body } = await rawGet(`${BASE}/${ep}`);
                if (status === 200 && Array.isArray(body) && body.length > 0) {
                    console.log(`✅ ${ep} → ${body.length} events`);
                    console.log('   Event types:', [...new Set(body.map((e: any) => e.type))].join(', '));
                    console.log('   First event:', JSON.stringify(body[0], null, 2).slice(0, 400));
                    found++;
                    break;
                }
            }
        } catch { }
    }
    if (found === 0) console.log('No events found in first 20 vehicles.');
}

run().catch(console.error);
