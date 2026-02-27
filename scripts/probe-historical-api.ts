/**
 * Fresh probe of all Frotcom API endpoints to definitively confirm
 * whether historical date filtering works.
 *
 * Method: Call each endpoint twice with very different dates.
 * If results differ → historical data available.
 * If results are identical → API ignores date parameters.
 *
 * Test dates: Feb 14 vs Feb 25, 2026
 * (11-day gap, different working days, clearly different expected mileage)
 */
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// ─── Test subjects ────────────────────────────────────────────────────────────
const VID = 320225;  // CB1783ME (Живко's vehicle)
const DID = 308019;  // Живко Георгиев Иванов - Петрич

// ─── Date windows (Sofia local time, EET = UTC+2 in February) ────────────────
const D1_S = '2026-02-14T00:00:00+02:00';
const D1_E = '2026-02-14T23:59:59+02:00';
const D2_S = '2026-02-25T00:00:00+02:00';
const D2_E = '2026-02-25T23:59:59+02:00';

let passCount = 0;
let failCount = 0;

async function probe(label: string, call14: () => Promise<any>, call25: () => Promise<any>) {
    process.stdout.write(`\n[TEST] ${label}... `);
    try {
        const [r14, r25] = await Promise.all([call14(), call25()]);

        // Extract a "fingerprint" for comparison
        const fp14 = fingerprint(r14);
        const fp25 = fingerprint(r25);

        const differ = fp14 !== fp25;

        if (differ) {
            console.log(`✅ HISTORICAL DATA AVAILABLE!`);
            console.log(`   Feb 14: ${fp14}`);
            console.log(`   Feb 25: ${fp25}`);
            passCount++;
        } else {
            console.log(`❌ Same result for both dates (ignores date)`);
            console.log(`   Both: ${fp14}`);
            failCount++;
        }
    } catch (err: any) {
        console.log(`⚠️  Error: ${err.message?.slice(0, 120)}`);
    }
}

function fingerprint(data: any): string {
    if (data === null || data === undefined) return 'null';
    if (Array.isArray(data)) {
        const totalMileage = data.reduce((sum, r) => sum + (r.mileage || r.mileageCanbus || r.distance || 0), 0);
        const count = data.length;
        return `${count} records, total_mileage=${totalMileage.toFixed(1)}`;
    }
    if (typeof data === 'object') {
        const keys = Object.keys(data).join(',');
        return `{${keys}} = ${JSON.stringify(data).slice(0, 100)}`;
    }
    return String(data).slice(0, 100);
}

async function run() {
    console.log('='.repeat(70));
    console.log('  FROTCOM HISTORICAL API PROBE');
    console.log(`  Date A: 2026-02-14 (Feb 14 — known to have 463km for Живко)`);
    console.log(`  Date B: 2026-02-25 (Feb 25 — today, ~7.8km for Живко)`);
    console.log('='.repeat(70));

    // ─── 1. Main ecodriving endpoint (no groupBy) ────────────────────────────
    await probe(
        'POST /v2/ecodriving/calculate (no groupBy, vehicle filter)',
        () => FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: D1_S, to_datetime: D1_E, vehicleIds: [VID]
        }),
        () => FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: D2_S, to_datetime: D2_E, vehicleIds: [VID]
        })
    );

    // ─── 2. Main ecodriving endpoint (no groupBy, driver filter) ─────────────
    await probe(
        'POST /v2/ecodriving/calculate (no groupBy, driver filter)',
        () => FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: D1_S, to_datetime: D1_E, driverIds: [DID]
        }),
        () => FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: D2_S, to_datetime: D2_E, driverIds: [DID]
        })
    );

    // ─── 3. Trips endpoint ────────────────────────────────────────────────────
    await probe(
        'GET /v2/vehicles/{id}/trips',
        () => FrotcomClient.request<any[]>(`v2/vehicles/${VID}/trips?from_datetime=${D1_S}&to_datetime=${D1_E}`),
        () => FrotcomClient.request<any[]>(`v2/vehicles/${VID}/trips?from_datetime=${D2_S}&to_datetime=${D2_E}`)
    );

    // ─── 4. Mileage and time ──────────────────────────────────────────────────
    await probe(
        'GET /v2/vehicles/{id}/mileageandtime',
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/mileageandtime?from_datetime=${D1_S}&to_datetime=${D1_E}`),
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/mileageandtime?from_datetime=${D2_S}&to_datetime=${D2_E}`)
    );

    // ─── 5. Driver driving times ──────────────────────────────────────────────
    await probe(
        'GET /v2/drivers/drivingtimes/{driverId}',
        () => FrotcomClient.request<any>(`v2/drivers/drivingtimes/${DID}?from_datetime=${D1_S}&to_datetime=${D1_E}`),
        () => FrotcomClient.request<any>(`v2/drivers/drivingtimes/${DID}?from_datetime=${D2_S}&to_datetime=${D2_E}`)
    );

    // ─── 6. Ecodriving events per vehicle+driver ──────────────────────────────
    await probe(
        'GET /v2/ecodriving/events/{vehicleId}/{driverId}',
        () => FrotcomClient.request<any>(`v2/ecodriving/events/${VID}/${DID}?from_datetime=${D1_S}&to_datetime=${D1_E}`),
        () => FrotcomClient.request<any>(`v2/ecodriving/events/${VID}/${DID}?from_datetime=${D2_S}&to_datetime=${D2_E}`)
    );

    // ─── 7. Vehicle locations (GPS track) ────────────────────────────────────
    await probe(
        'GET /v2/vehicles/{id}/locations',
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/locations?from_datetime=${D1_S}&to_datetime=${D1_E}`),
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/locations?from_datetime=${D2_S}&to_datetime=${D2_E}`)
    );

    // ─── 8. Fleet trips ───────────────────────────────────────────────────────
    await probe(
        'GET /v2/fleet/trips',
        () => FrotcomClient.request<any>(`v2/fleet/trips?from_datetime=${D1_S}&to_datetime=${D1_E}&driverId=${DID}`),
        () => FrotcomClient.request<any>(`v2/fleet/trips?from_datetime=${D2_S}&to_datetime=${D2_E}&driverId=${DID}`)
    );

    // ─── 9. Driver ecodriving (GET endpoint) ─────────────────────────────────
    await probe(
        'GET /v2/ecodriving/driver (individual)',
        () => FrotcomClient.request<any>(`v2/ecodriving/driver?id=${DID}&from_datetime=${D1_S}&to_datetime=${D1_E}`),
        () => FrotcomClient.request<any>(`v2/ecodriving/driver?id=${DID}&from_datetime=${D2_S}&to_datetime=${D2_E}`)
    );

    // ─── 10. ecodriving calculate ALL fleet (no filter) ──────────────────────
    await probe(
        'POST /v2/ecodriving/calculate (ALL fleet, no filters)',
        () => FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: D1_S, to_datetime: D1_E
        }),
        () => FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: D2_S, to_datetime: D2_E
        })
    );

    // ─── Summary ─────────────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(70));
    console.log(`  SUMMARY: ${passCount} endpoints have HISTORICAL DATA / ${failCount} ignore dates`);
    if (passCount > 0) {
        console.log('  ✅ Historical data IS available via some endpoint(s) above!');
    } else {
        console.log('  ❌ CONFIRMED: Frotcom API has NO accessible historical data.');
        console.log('     The daily-capture strategy is the ONLY viable approach.');
    }
    console.log('='.repeat(70));
}

run().catch(console.error);
