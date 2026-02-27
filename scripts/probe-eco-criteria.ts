/**
 * Deep probe for all ecodriving sub-criteria.
 * 
 * The Frotcom UI shows 11 score components:
 *   1. Harsh acceleration (low speed)
 *   2. Harsh acceleration (high speed)
 *   3. Harsh braking (low speed)
 *   4. Harsh braking (high speed)
 *   5. Sharp cornering
 *   6. Sudden brake/acc change
 *   7. Excessive idling        → idleTimePerc ✅ 
 *   8. High RPM time           → highRPMPerc  ✅
 *   9. Alarms
 *  10. Time without cruise control
 *  11. Acceleration on cruise control
 *
 * We need to find fields 1-6, 9-11 in the API.
 */
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const VID = 320225; // CB1783ME
const DID = 308019; // Живко

async function run() {
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Sofia' }).format(new Date());
    const start = `${today}T00:00:00+02:00`;
    const end = `${today}T23:59:59+02:00`;

    console.log('='.repeat(70));
    console.log('  DEEP FIELD PROBE — Looking for all 11 sub-criteria');
    console.log('='.repeat(70));

    // ─── 1. v2/ecodriving/calculate — single vehicle, check ALL keys ──────────
    console.log('\n[1] POST /v2/ecodriving/calculate — vehicle CB1783ME, ALL fields:');
    try {
        const r = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: start, to_datetime: end, vehicleIds: [VID]
        });
        const rec = r?.find((x: any) => x.vehicleId === VID) || r?.[0];
        if (rec) {
            console.log('Keys:', Object.keys(rec).join(', '));
            console.log('Full record:', JSON.stringify(rec, null, 2));
        }
    } catch (e: any) { console.log('Error:', e.message); }

    // ─── 2. v2/ecodriving/events — per vehicle+driver ────────────────────────
    console.log('\n[2] GET /v2/ecodriving/events/vehicleId/driverId — event details:');
    try {
        const r = await FrotcomClient.request<any>(`v2/ecodriving/events/${VID}/${DID}?from_datetime=${start}&to_datetime=${end}`);
        console.log('Keys:', r ? Object.keys(r).join(', ') : 'null');
        console.log(JSON.stringify(r, null, 2).slice(0, 2000));
    } catch (e: any) { console.log('Error:', e.message); }

    // ─── 3. v2/ecodriving/events without driverId ────────────────────────────
    console.log('\n[3] GET /v2/ecodriving/events/vehicleId (no driver):');
    try {
        const r = await FrotcomClient.request<any>(`v2/ecodriving/events/${VID}?from_datetime=${start}&to_datetime=${end}`);
        console.log(JSON.stringify(r, null, 2).slice(0, 2000));
    } catch (e: any) { console.log('Error:', e.message); }

    // ─── 4. v2/ecodriving/driver — dedicated driver endpoint ─────────────────
    console.log('\n[4] GET /v2/ecodriving/driver:');
    try {
        const r = await FrotcomClient.request<any>(`v2/ecodriving/driver?id=${DID}&from_datetime=${start}&to_datetime=${end}`);
        console.log(JSON.stringify(r, null, 2).slice(0, 2000));
    } catch (e: any) { console.log('Error:', e.message); }

    // ─── 5. v2/ecodriving (root) ─────────────────────────────────────────────
    console.log('\n[5] GET /v2/ecodriving (root):');
    try {
        const r = await FrotcomClient.request<any>(`v2/ecodriving`);
        console.log(JSON.stringify(r, null, 2).slice(0, 2000));
    } catch (e: any) { console.log('Error:', e.message); }

    // ─── 6. SAMPLE 5 records from calculate — are any keys different? ─────────
    console.log('\n[6] Scanning 5 records from calculate for any EXTRA keys...');
    try {
        const r = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: start, to_datetime: end
        });
        const allKeys = new Set<string>();
        r?.slice(0, 10).forEach((rec: any) => Object.keys(rec).forEach(k => allKeys.add(k)));
        console.log('Union of all keys across first 10 records:');
        console.log([...allKeys].join(', '));

        // Check if any record has non-empty recommendations
        const withRecs = r?.filter((rec: any) => rec.recommendations?.length > 0);
        if (withRecs?.length > 0) {
            console.log('\nRecord WITH recommendations:', JSON.stringify(withRecs[0], null, 2).slice(0, 2000));
        } else {
            console.log('All recommendations arrays are empty.');
        }
    } catch (e: any) { console.log('Error:', e.message); }

    // ─── 7. v2/ecodriving/calculate with groupBy:vehicle ──────────────────────
    console.log('\n[7] POST /v2/ecodriving/calculate with groupBy:vehicle:');
    try {
        const r = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: start, to_datetime: end,
            vehicleIds: [VID],
            groupBy: 'vehicle'
        });
        if (r?.[0]) {
            console.log('Keys:', Object.keys(r[0]).join(', '));
            console.log(JSON.stringify(r[0], null, 2));
        }
    } catch (e: any) { console.log('Error:', e.message); }

    // ─── 8. Check if ecoProfileId=4 gives more detail ────────────────────────
    console.log('\n[8] POST /v2/ecodriving/calculate with ecoProfileId=4:');
    try {
        const r = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: start, to_datetime: end,
            vehicleIds: [VID],
            ecoProfileId: 4
        });
        const rec = r?.find((x: any) => x.vehicleId === VID) || r?.[0];
        if (rec) {
            console.log('Keys:', Object.keys(rec).join(', '));
            console.log(JSON.stringify(rec, null, 2));
        }
    } catch (e: any) { console.log('Error:', e.message); }
}

run().catch(console.error);
