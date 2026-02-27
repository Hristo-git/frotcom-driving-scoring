/**
 * Comprehensive test to find a Frotcom API endpoint that returns DATE-ACCURATE historical data.
 * Tests everything not yet tried.
 */
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const VID = 320225;    // CB1783ME
const DID = 308019;    // Живко

// If any endpoint returns DIFFERENT km for different dates, it respects history.
// Expected: Feb 14 ≈ 463 km (busy day), Feb 21 = different, Jan 1 ≈ 0 (holiday)

async function check(label: string, fn: () => Promise<any>) {
    try {
        const res = await fn();
        return res;
    } catch (e: any) {
        console.log(`  ❌ ${label}: ${e.message.slice(0, 80)}`);
        return null;
    }
}

async function run() {

    // ─── 1. GET /v2/accounts/ecoScores ───────────────────────────────────────
    console.log('\n════ 1. GET /v2/accounts/ecoScores ════');
    const ecoScores = await check('ecoScores', () =>
        FrotcomClient.request<any>('v2/accounts/ecoScores'));
    if (ecoScores) {
        console.log('Type:', typeof ecoScores, Array.isArray(ecoScores) ? `[${ecoScores.length}]` : '');
        console.log(JSON.stringify(Array.isArray(ecoScores) ? ecoScores.slice(0, 2) : ecoScores, null, 2).slice(0, 600));
    }

    // ─── 2. Ecodriving with LONGER windows — does count/km change? ────────────
    console.log('\n════ 2. ecodriving/calculate with varying windows ════');
    const windows = [
        { label: 'single day Feb 14',   s: '2026-02-14T00:00:00+02:00', e: '2026-02-14T23:59:59+02:00' },
        { label: 'full week Feb 10-16', s: '2026-02-10T00:00:00+02:00', e: '2026-02-16T23:59:59+02:00' },
        { label: 'full week Feb 17-22', s: '2026-02-17T00:00:00+02:00', e: '2026-02-22T23:59:59+02:00' },
        { label: 'month Feb 1-22',      s: '2026-02-01T00:00:00+02:00', e: '2026-02-22T23:59:59+02:00' },
        { label: 'Jan 1 only',          s: '2026-01-01T00:00:00+02:00', e: '2026-01-01T23:59:59+02:00' },
    ];
    for (const w of windows) {
        const res = await FrotcomClient.calculateEcodriving(w.s, w.e, [DID], undefined, 'driver');
        const rec = res[0];
        console.log(`  ${w.label}: mileage=${rec?.mileage?.toFixed(1) ?? 'N/A'}, score=${rec?.score ?? '-'}`);
    }

    // ─── 3. v2/trips (POST) — fleet trips for Feb 14 ──────────────────────────
    console.log('\n════ 3. POST /v2/trips ════');
    for (const w of windows.slice(0, 3)) {
        const res = await check(w.label, () =>
            FrotcomClient.request<any>('v2/trips', 'POST', {
                from_datetime: w.s,
                to_datetime:   w.e,
                vehicleIds:    [VID],
            }));
        if (res) {
            const items = Array.isArray(res) ? res : (res.data || res.items || res.trips || []);
            const km = items.reduce((s: number, t: any) => s + (t.mileageCanbus || t.mileage || t.distance || 0), 0);
            console.log(`  ${w.label}: ${items.length} trips, ${km.toFixed(1)} km`);
            if (items.length > 0 && w.label.includes('Feb 14')) {
                console.log('  First trip fields:', Object.keys(items[0]).join(', '));
                console.log('  First trip:', JSON.stringify(items[0]).slice(0, 200));
            }
        }
    }

    // ─── 4. v2/vehicles/{id}/trips with Unix timestamps — different ranges ────
    console.log('\n════ 4. v2/vehicles/trips with Unix timestamps ════');
    const unixWindows = [
        { label: 'Feb 14 (local Sofia)',
          s: Math.floor(new Date('2026-02-13T22:00:00Z').getTime() / 1000),
          e: Math.floor(new Date('2026-02-14T21:59:59Z').getTime() / 1000) },
        { label: 'Feb 10–16 (week)',
          s: Math.floor(new Date('2026-02-09T22:00:00Z').getTime() / 1000),
          e: Math.floor(new Date('2026-02-16T21:59:59Z').getTime() / 1000) },
        { label: 'Feb 17–22 (this week)',
          s: Math.floor(new Date('2026-02-16T22:00:00Z').getTime() / 1000),
          e: Math.floor(new Date('2026-02-22T21:59:59Z').getTime() / 1000) },
        { label: 'Jan 01 (holiday)',
          s: Math.floor(new Date('2025-12-31T22:00:00Z').getTime() / 1000),
          e: Math.floor(new Date('2026-01-01T21:59:59Z').getTime() / 1000) },
    ];
    for (const w of unixWindows) {
        const res = await check(w.label, () =>
            FrotcomClient.request<any[]>(`v2/vehicles/${VID}/trips?from_datetime=${w.s}&to_datetime=${w.e}`));
        if (res) {
            const km = res.reduce((s: number, t: any) => s + (t.mileageCanbus || t.mileage || 0), 0);
            console.log(`  ${w.label}: ${res.length} trips, ${km.toFixed(1)} km`);
            if (res.length > 0 && w.label.includes('Feb 14')) {
                console.log('  Trip sample:', JSON.stringify({ started: res[0]?.started, ended: res[0]?.ended, mileageCanbus: res[0]?.mileageCanbus }).slice(0, 200));
            }
        }
    }

    // ─── 5. Pagination — maybe trips endpoint returns LAST N trips ────────────
    console.log('\n════ 5. v2/vehicles/trips pagination (no date filter) ════');
    for (const page of [1, 2, 3]) {
        const res = await check(`page=${page}`, () =>
            FrotcomClient.request<any[]>(`v2/vehicles/${VID}/trips?page=${page}&limit=50`));
        if (res) {
            const firstDate = res[0]?.started || res[0]?.startedAt || '?';
            const lastDate  = res[res.length - 1]?.started || res[res.length - 1]?.startedAt || '?';
            console.log(`  page=${page}: ${res.length} trips | first=${firstDate} | last=${lastDate}`);
        }
    }

    // ─── 6. v2/vehicles/{id}/activity ────────────────────────────────────────
    console.log('\n════ 6. v2/vehicles/activity for different dates ════');
    const activityDates = [
        { label: 'Feb 14', s: '2026-02-14T00:00:00+02:00', e: '2026-02-14T23:59:59+02:00' },
        { label: 'Feb 19', s: '2026-02-19T00:00:00+02:00', e: '2026-02-19T23:59:59+02:00' },
    ];
    for (const d of activityDates) {
        const res = await check(d.label, () =>
            FrotcomClient.request<any>(`v2/vehicles/${VID}/activity?from_datetime=${d.s}&to_datetime=${d.e}`));
        if (res) {
            const preview = JSON.stringify(res).slice(0, 200);
            console.log(`  ${d.label}: ${preview}`);
        }
    }

    // ─── 7. ecodriving/details and ecodriving/ranking ────────────────────────
    console.log('\n════ 7. Other ecodriving endpoints ════');
    const ecoEndpoints = [
        `v2/ecodriving/details?from_datetime=2026-02-14T00:00:00+02:00&to_datetime=2026-02-14T23:59:59+02:00&driverId=${DID}`,
        `v2/ecodriving/details?from_datetime=2026-02-14T00:00:00+02:00&to_datetime=2026-02-14T23:59:59+02:00`,
        `v2/ecodriving/ranking?from_datetime=2026-02-14T00:00:00+02:00&to_datetime=2026-02-14T23:59:59+02:00`,
        `v2/ecodriving/history?driverId=${DID}`,
        `v2/drivers/${DID}/ecodriving`,
        `v2/drivers/${DID}/ecodriving?from_datetime=2026-02-14T00:00:00+02:00&to_datetime=2026-02-14T23:59:59+02:00`,
        `v2/drivers/${DID}/trips?from_datetime=2026-02-14T00:00:00+02:00&to_datetime=2026-02-14T23:59:59+02:00`,
        `v2/drivers/${DID}/trips`,
    ];
    for (const ep of ecoEndpoints) {
        const res = await check(ep, () => FrotcomClient.request<any>(ep));
        if (res) {
            const count = Array.isArray(res) ? res.length : 'obj';
            const preview = JSON.stringify(res).slice(0, 150);
            console.log(`  ✅ ${ep.split('?')[0].split('/').slice(-2).join('/')}: [${count}] ${preview}`);
        }
    }

    // ─── 8. ecodriving/calculate WITHOUT any date — what does it return? ─────
    console.log('\n════ 8. ecodriving/calculate with NO dates ════');
    const noDateRes = await check('no dates', () =>
        FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            driverIds: [DID],
            groupBy: 'driver'
        }));
    if (noDateRes) {
        console.log(`  Result: mileage=${noDateRes[0]?.mileage}, score=${noDateRes[0]?.score}`);
        console.log(`  (Compare with groupBy+Feb14: 282.3 km — are they the same?)`);
    }
}

run().catch(console.error);
