/**
 * Tests whether the ecodriving/calculate API respects date filters.
 * Compares CB1783ME results for 3 different dates with and without groupBy.
 */
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const VEHICLE_ID = 320225; // CB1783ME

const dates = [
    { label: 'Feb 14 (Sat)', start: '2026-02-14T00:00:00+02:00', end: '2026-02-14T23:59:59+02:00' },
    { label: 'Jan 01 (Thu)', start: '2026-01-01T00:00:00+02:00', end: '2026-01-01T23:59:59+02:00' },
    { label: 'Feb 22 (Sun)', start: '2026-02-22T00:00:00+02:00', end: '2026-02-22T23:59:59+02:00' },
];

async function run() {
    console.log('\n═══ No groupBy, no filters — find CB1783ME ═══');
    for (const d of dates) {
        const res = await FrotcomClient.calculateEcodriving(d.start, d.end);
        const rec = res.find((r: any) => r.licensePlate === 'CB1783ME');
        console.log(`${d.label}: canbus=${rec?.mileageCanbus ?? 'NOT FOUND'}, score=${rec?.score ?? '-'}, driversId=${JSON.stringify(rec?.driversId)}`);
    }

    console.log('\n═══ groupBy=vehicle, vehicleIds=[CB1783ME] ═══');
    for (const d of dates) {
        try {
            const res = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
                from_datetime: d.start,
                to_datetime:   d.end,
                vehicleIds:    [VEHICLE_ID],
                groupBy:       'vehicle'
            });
            const rec = res[0];
            console.log(`${d.label}: canbus=${rec?.mileageCanbus ?? 'NOT FOUND'}, score=${rec?.score ?? '-'}`);
        } catch (e: any) { console.log(`${d.label}: ERROR ${e.message}`); }
    }

    console.log('\n═══ groupBy=driver, driverIds=[308019] ═══');
    for (const d of dates) {
        const res = await FrotcomClient.calculateEcodriving(d.start, d.end, [308019], undefined, 'driver');
        const rec = res[0];
        console.log(`${d.label}: mileage=${rec?.mileage ?? 'NOT FOUND'}, score=${rec?.score ?? '-'}`);
    }

    console.log('\n═══ v2/trips for CB1783ME (Unix timestamps) ═══');
    for (const d of dates) {
        try {
            const startTs = Math.floor(new Date(d.start).getTime() / 1000);
            const endTs   = Math.floor(new Date(d.end).getTime() / 1000);
            const trips = await FrotcomClient.request<any[]>(
                `v2/vehicles/${VEHICLE_ID}/trips?from_datetime=${startTs}&to_datetime=${endTs}`, 'GET'
            );
            const totalKm = trips.reduce((s: number, t: any) => s + (t.mileage || 0), 0);
            console.log(`${d.label}: ${trips.length} trips, total=${totalKm.toFixed(1)} km`);
        } catch (e: any) { console.log(`${d.label}: ERROR ${e.message}`); }
    }
}

run().catch(console.error);
