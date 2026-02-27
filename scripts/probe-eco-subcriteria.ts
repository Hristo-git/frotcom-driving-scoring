/**
 * Investigate:
 * 1. What do "recommendations" numbers [3, 4] map to?
 * 2. Does the ecoprofile definition expose sub-criteria weights?
 * 3. Are there any vehicles/drivers with detailed sub-score breakdowns?
 */
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Sofia' }).format(new Date());
    const start = `${today}T00:00:00+02:00`;
    const end = `${today}T23:59:59+02:00`;

    // ─── 1. Fetch ecoprofiles — do they contain sub-criteria? ─────────────────
    console.log('=== [1] GET /v2/ecoprofiles ===');
    try {
        const r = await FrotcomClient.request<any>('v2/ecoprofiles');
        console.log(JSON.stringify(r, null, 2).slice(0, 3000));
    } catch (e: any) { console.log('Error:', e.message); }

    // ─── 2. Fetch ecoprofile 4 directly ───────────────────────────────────────
    console.log('\n=== [2] GET /v2/ecoprofiles/4 ===');
    try {
        const r = await FrotcomClient.request<any>('v2/ecoprofiles/4');
        console.log(JSON.stringify(r, null, 2).slice(0, 3000));
    } catch (e: any) { console.log('Error:', e.message); }

    // ─── 3. All records → find those with recommendations, list unique values ──
    console.log('\n=== [3] All recommendation IDs in today\'s fleet ===');
    try {
        const r = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: start, to_datetime: end
        });
        const recMap = new Map<number, number>(); // recId → count
        r?.forEach((rec: any) => {
            (rec.recommendations || []).forEach((id: number) => {
                recMap.set(id, (recMap.get(id) || 0) + 1);
            });
        });
        console.log('Recommendation IDs and their frequency:');
        [...recMap.entries()].sort((a, b) => a[0] - b[0]).forEach(([id, cnt]) => {
            console.log(`  ID ${id}: ${cnt} vehicles`);
        });

        // Print a record with diverse recommendations
        const diverse = r?.filter((rec: any) => rec.recommendations?.length >= 3);
        if (diverse?.length > 0) {
            console.log('\nRecord with most recommendations:', JSON.stringify(diverse[0], null, 2));
        }
    } catch (e: any) { console.log('Error:', e.message); }

    // ─── 4. Try /v2/ecodriving/calculate with expand/detail param ─────────────
    console.log('\n=== [4] With expand=true or detail=true ===');
    for (const extra of [
        { expand: true },
        { detail: true },
        { detailed: true },
        { includeEvents: true },
        { withEvents: true },
    ]) {
        try {
            const r = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
                from_datetime: start, to_datetime: end,
                vehicleIds: [320225], // just CB1783ME
                ...extra
            });
            const rec = r?.[0];
            if (rec) {
                const keys = Object.keys(rec);
                const hasNew = keys.some(k => !['recommendations', 'hasTripsWithEco', 'vehicleId', 'licensePlate', 'drivers', 'ecoProfileId', 'driversId', 'score', 'scoreCustomized', 'mileage', 'drivingTime', 'averageConsumption', 'mileageGps', 'mileageCanbus', 'totalConsumption', 'averageSpeed', 'idleTimePerc', 'highRPMPerc', 'hasLowMileage'].includes(k));
                if (hasNew) {
                    console.log(`  Extra param ${JSON.stringify(extra)} → NEW KEYS: ${keys.join(', ')}`);
                    console.log(JSON.stringify(rec, null, 2));
                } else {
                    console.log(`  ${JSON.stringify(extra)} → No new fields`);
                }
            }
        } catch (e: any) { console.log(`  ${JSON.stringify(extra)} Error:`, e.message?.slice(0, 80)); }
    }

    // ─── 5. Try ecodriving/calculate/detailed or similar ─────────────────────
    console.log('\n=== [5] Alternate URL variants ===');
    for (const ep of [
        'v2/ecodriving/calculate/details',
        'v2/ecodriving/scores',
        'v2/ecodriving/histogram',
        'v2/ecodriving/driverhistory',
        'v2/ecodriving/statistics',
    ]) {
        try {
            const r = await FrotcomClient.request<any>(ep, 'POST', {
                from_datetime: start, to_datetime: end, vehicleIds: [320225]
            });
            console.log(`  ✅ ${ep}: ${JSON.stringify(r).slice(0, 200)}`);
        } catch (e: any) { console.log(`  ❌ ${ep}: ${e.message?.slice(0, 60)}`); }
    }
}

run().catch(console.error);
