/**
 * Tests ALL untested Frotcom endpoints that might hold historical data.
 * Key test: do Feb 14 and Feb 21 return DIFFERENT results?
 * If yes → endpoint respects dates → can be used for historical sync.
 */
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const VID = 320225;   // CB1783ME
const DID = 308019;   // Живко

const FEB14_S = '2026-02-14T00:00:00+02:00';
const FEB14_E = '2026-02-14T23:59:59+02:00';
const FEB21_S = '2026-02-21T00:00:00+02:00';
const FEB21_E = '2026-02-21T23:59:59+02:00';

// Unix timestamps (Sofia local time)
const FEB14_UNIX_S = Math.floor(new Date('2026-02-13T22:00:00Z').getTime() / 1000);
const FEB14_UNIX_E = Math.floor(new Date('2026-02-14T21:59:59Z').getTime() / 1000);
const FEB21_UNIX_S = Math.floor(new Date('2026-02-20T22:00:00Z').getTime() / 1000);
const FEB21_UNIX_E = Math.floor(new Date('2026-02-21T21:59:59Z').getTime() / 1000);

function summarize(res: any): string {
    if (res === null || res === undefined) return 'null';
    if (Array.isArray(res)) return `[${res.length} items] ${JSON.stringify(res[0] || {}).slice(0, 120)}`;
    return JSON.stringify(res).slice(0, 200);
}

async function try2dates(label: string, fn14: () => Promise<any>, fn21: () => Promise<any>) {
    console.log(`\n── ${label} ──`);
    try {
        const r14 = await fn14();
        const r21 = await fn21();
        const s14 = summarize(r14);
        const s21 = summarize(r21);
        const differ = s14 !== s21;
        console.log(`  Feb 14: ${s14}`);
        console.log(`  Feb 21: ${s21}`);
        if (differ) {
            console.log(`  ✅✅✅ DATES DIFFER — THIS ENDPOINT HAS HISTORICAL DATA! ✅✅✅`);
        } else {
            console.log(`  ⚠️  same result for both dates`);
        }
    } catch (e: any) {
        console.log(`  ❌ ${e.message.slice(0, 100)}`);
    }
}

async function tryOnce(label: string, fn: () => Promise<any>) {
    console.log(`\n── ${label} ──`);
    try {
        const res = await fn();
        console.log(`  ✅ ${summarize(res)}`);
        if (Array.isArray(res) && res.length > 0) {
            console.log(`  Keys: ${Object.keys(res[0]).join(', ')}`);
        } else if (res && typeof res === 'object') {
            console.log(`  Keys: ${Object.keys(res).join(', ')}`);
        }
    } catch (e: any) {
        console.log(`  ❌ ${e.message.slice(0, 100)}`);
    }
}

async function run() {

    // ─── 1. mileageandtime — most promising ───────────────────────────────────
    await try2dates(
        'GET /v2/vehicles/{id}/mileageandtime',
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/mileageandtime?from_datetime=${FEB14_S}&to_datetime=${FEB14_E}`),
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/mileageandtime?from_datetime=${FEB21_S}&to_datetime=${FEB21_E}`)
    );

    // Try with Unix timestamps too
    await try2dates(
        'GET /v2/vehicles/{id}/mileageandtime (Unix timestamps)',
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/mileageandtime?from_datetime=${FEB14_UNIX_S}&to_datetime=${FEB14_UNIX_E}`),
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/mileageandtime?from_datetime=${FEB21_UNIX_S}&to_datetime=${FEB21_UNIX_E}`)
    );

    // ─── 2. ecodriving events ─────────────────────────────────────────────────
    await try2dates(
        'GET /v2/ecodriving/events/{vehicleId}/{driverId}',
        () => FrotcomClient.request<any>(`v2/ecodriving/events/${VID}/${DID}?from_datetime=${FEB14_S}&to_datetime=${FEB14_E}`),
        () => FrotcomClient.request<any>(`v2/ecodriving/events/${VID}/${DID}?from_datetime=${FEB21_S}&to_datetime=${FEB21_E}`)
    );

    await try2dates(
        'GET /v2/ecodriving/events (Unix timestamps)',
        () => FrotcomClient.request<any>(`v2/ecodriving/events/${VID}/${DID}?from_datetime=${FEB14_UNIX_S}&to_datetime=${FEB14_UNIX_E}`),
        () => FrotcomClient.request<any>(`v2/ecodriving/events/${VID}/${DID}?from_datetime=${FEB21_UNIX_S}&to_datetime=${FEB21_UNIX_E}`)
    );

    // ─── 3. vehicle events ────────────────────────────────────────────────────
    await try2dates(
        'GET /v2/vehicles/{id}/events',
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/events?from_datetime=${FEB14_S}&to_datetime=${FEB14_E}`),
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/events?from_datetime=${FEB21_S}&to_datetime=${FEB21_E}`)
    );

    await try2dates(
        'GET /v2/vehicles/{id}/events (Unix timestamps)',
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/events?from_datetime=${FEB14_UNIX_S}&to_datetime=${FEB14_UNIX_E}`),
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/events?from_datetime=${FEB21_UNIX_S}&to_datetime=${FEB21_UNIX_E}`)
    );

    // ─── 4. fuel history ─────────────────────────────────────────────────────
    await try2dates(
        'GET /v2/vehicles/{id}/fuel',
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/fuel?from_datetime=${FEB14_S}&to_datetime=${FEB14_E}`),
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/fuel?from_datetime=${FEB21_S}&to_datetime=${FEB21_E}`)
    );

    await try2dates(
        'GET /v2/vehicles/{id}/fuel (Unix)',
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/fuel?from_datetime=${FEB14_UNIX_S}&to_datetime=${FEB14_UNIX_E}`),
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/fuel?from_datetime=${FEB21_UNIX_S}&to_datetime=${FEB21_UNIX_E}`)
    );

    // ─── 5. driver driving times ──────────────────────────────────────────────
    await try2dates(
        'GET /v2/drivers/drivingtimes/{driverId}',
        () => FrotcomClient.request<any>(`v2/drivers/drivingtimes/${DID}?from_datetime=${FEB14_S}&to_datetime=${FEB14_E}`),
        () => FrotcomClient.request<any>(`v2/drivers/drivingtimes/${DID}?from_datetime=${FEB21_S}&to_datetime=${FEB21_E}`)
    );

    await tryOnce('GET /v2/drivers/drivingtimes (no date)',
        () => FrotcomClient.request<any>(`v2/drivers/drivingtimes/${DID}`));

    // ─── 6. driver activity ───────────────────────────────────────────────────
    await try2dates(
        'GET /v2/drivers/activity',
        () => FrotcomClient.request<any>(`v2/drivers/activity?from_datetime=${FEB14_S}&to_datetime=${FEB14_E}&driverId=${DID}`),
        () => FrotcomClient.request<any>(`v2/drivers/activity?from_datetime=${FEB21_S}&to_datetime=${FEB21_E}&driverId=${DID}`)
    );

    // ─── 7. vehicle locations (historical GPS track) ──────────────────────────
    await try2dates(
        'GET /v2/vehicles/{id}/locations',
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/locations?from_datetime=${FEB14_S}&to_datetime=${FEB14_E}`),
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/locations?from_datetime=${FEB21_S}&to_datetime=${FEB21_E}`)
    );

    await try2dates(
        'GET /v2/vehicles/{id}/locations (Unix)',
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/locations?from_datetime=${FEB14_UNIX_S}&to_datetime=${FEB14_UNIX_E}`),
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/locations?from_datetime=${FEB21_UNIX_S}&to_datetime=${FEB21_UNIX_E}`)
    );

    // ─── 8. checkTrips (POST) ─────────────────────────────────────────────────
    await try2dates(
        'POST /v2/vehicles/checkTrips',
        () => FrotcomClient.request<any>('v2/vehicles/checkTrips', 'POST', { vehicleId: VID, from_datetime: FEB14_S, to_datetime: FEB14_E }),
        () => FrotcomClient.request<any>('v2/vehicles/checkTrips', 'POST', { vehicleId: VID, from_datetime: FEB21_S, to_datetime: FEB21_E })
    );

    await try2dates(
        'POST /v2/drivers/checkTrips',
        () => FrotcomClient.request<any>('v2/drivers/checkTrips', 'POST', { driverId: DID, from_datetime: FEB14_S, to_datetime: FEB14_E }),
        () => FrotcomClient.request<any>('v2/drivers/checkTrips', 'POST', { driverId: DID, from_datetime: FEB21_S, to_datetime: FEB21_E })
    );

    // ─── 9. alarm occurrences ─────────────────────────────────────────────────
    await try2dates(
        'POST /v2/alarms/occurrences',
        () => FrotcomClient.request<any>('v2/alarms/occurrences', 'POST', { vehicleIds: [VID], from_datetime: FEB14_S, to_datetime: FEB14_E }),
        () => FrotcomClient.request<any>('v2/alarms/occurrences', 'POST', { vehicleIds: [VID], from_datetime: FEB21_S, to_datetime: FEB21_E })
    );

    await try2dates(
        'POST /v2/alarms/occurrencesextended',
        () => FrotcomClient.request<any>('v2/alarms/occurrencesextended', 'POST', { vehicleIds: [VID], from_datetime: FEB14_S, to_datetime: FEB14_E }),
        () => FrotcomClient.request<any>('v2/alarms/occurrencesextended', 'POST', { vehicleIds: [VID], from_datetime: FEB21_S, to_datetime: FEB21_E })
    );

    // ─── 10. fleet trips ──────────────────────────────────────────────────────
    await try2dates(
        'GET /v2/fleet/trips',
        () => FrotcomClient.request<any>(`v2/fleet/trips?from_datetime=${FEB14_S}&to_datetime=${FEB14_E}`),
        () => FrotcomClient.request<any>(`v2/fleet/trips?from_datetime=${FEB21_S}&to_datetime=${FEB21_E}`)
    );

    // ─── 11. graphs ───────────────────────────────────────────────────────────
    await try2dates(
        'GET /v2/vehicles/{id}/graphs',
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/graphs?from_datetime=${FEB14_S}&to_datetime=${FEB14_E}`),
        () => FrotcomClient.request<any>(`v2/vehicles/${VID}/graphs?from_datetime=${FEB21_S}&to_datetime=${FEB21_E}`)
    );

    // ─── 12. TrackingData ─────────────────────────────────────────────────────
    await try2dates(
        'POST /v2/TrackingData/Vehicle',
        () => FrotcomClient.request<any>('v2/TrackingData/Vehicle', 'POST', { vehicleId: VID, from_datetime: FEB14_S, to_datetime: FEB14_E }),
        () => FrotcomClient.request<any>('v2/TrackingData/Vehicle', 'POST', { vehicleId: VID, from_datetime: FEB21_S, to_datetime: FEB21_E })
    );

    // ─── 13. vehicle trip by ID (maybe with date for navigation) ─────────────
    await tryOnce('GET /v2/fleet/recentactivity', () => FrotcomClient.request<any>('v2/fleet/recentactivity'));

    // ─── 14. driverScorecard ──────────────────────────────────────────────────
    await try2dates(
        'GET /driverScorecard/score/driverScorePDF',
        () => FrotcomClient.request<any>(`driverScorecard/score/driverScorePDF?driverId=${DID}&from_datetime=${FEB14_S}&to_datetime=${FEB14_E}`),
        () => FrotcomClient.request<any>(`driverScorecard/score/driverScorePDF?driverId=${DID}&from_datetime=${FEB21_S}&to_datetime=${FEB21_E}`)
    );

    // ─── 15. routes executions/arrivals ──────────────────────────────────────
    await try2dates(
        'POST /v2/routes/arrivalsDepartures',
        () => FrotcomClient.request<any>('v2/routes/arrivalsDepartures', 'POST', { vehicleIds: [VID], from_datetime: FEB14_S, to_datetime: FEB14_E }),
        () => FrotcomClient.request<any>('v2/routes/arrivalsDepartures', 'POST', { vehicleIds: [VID], from_datetime: FEB21_S, to_datetime: FEB21_E })
    );

    // ─── 16. ecodriving calculate — try with period param ────────────────────
    await try2dates(
        'POST /v2/ecodriving/calculate with "period" param',
        () => FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: FEB14_S, to_datetime: FEB14_E,
            vehicleIds: [VID], period: 'day'
        }),
        () => FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: FEB21_S, to_datetime: FEB21_E,
            vehicleIds: [VID], period: 'day'
        })
    );

    // ─── 17. costs list (could have date-based records) ───────────────────────
    await try2dates(
        'POST /v2/costs/list',
        () => FrotcomClient.request<any>('v2/costs/list', 'POST', { vehicleIds: [VID], from_datetime: FEB14_S, to_datetime: FEB14_E }),
        () => FrotcomClient.request<any>('v2/costs/list', 'POST', { vehicleIds: [VID], from_datetime: FEB21_S, to_datetime: FEB21_E })
    );

    console.log('\n\nDone. Look for ✅✅✅ above for endpoints with historical data.');
}

run().catch(console.error);
