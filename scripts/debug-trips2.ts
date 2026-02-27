
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const VEHICLE_ID = 320225; // CB1783ME
const DATE = '2026-02-14';

async function checkTripsPagination() {
    // Try different date filter params for the trips endpoint
    const dateFormats = [
        // Standard Frotcom params
        `v2/vehicles/${VEHICLE_ID}/trips?from_datetime=${DATE}T00:00:00&to_datetime=${DATE}T23:59:59`,
        `v2/vehicles/${VEHICLE_ID}/trips?startDate=${DATE}&endDate=${DATE}`,
        `v2/vehicles/${VEHICLE_ID}/trips?from=${DATE}T00:00:00&to=${DATE}T23:59:59`,
        `v2/vehicles/${VEHICLE_ID}/trips?dateFrom=${DATE}T00:00:00&dateTo=${DATE}T23:59:59`,
        `v2/vehicles/${VEHICLE_ID}/trips?start_date=${DATE}&end_date=${DATE}`,
        // Maybe paginate back in time
        `v2/vehicles/${VEHICLE_ID}/trips?page=2`,
        `v2/vehicles/${VEHICLE_ID}/trips?page=3`,
        `v2/vehicles/${VEHICLE_ID}/trips?limit=100&offset=0`,
        `v2/vehicles/${VEHICLE_ID}/trips?count=100`,
        // Activity endpoint with date filter
        `v2/vehicles/${VEHICLE_ID}/activity?from_datetime=2026-02-14T00:00:00&to_datetime=2026-02-14T23:59:59`,
        `v2/vehicles/${VEHICLE_ID}/activity?from_datetime=2026-02-19T00:00:00&to_datetime=2026-02-19T23:59:59`,
        // Overview endpoint
        `v2/vehicles/${VEHICLE_ID}/overview`,
        `v2/vehicles/${VEHICLE_ID}/statistics?from_datetime=${DATE}T00:00:00&to_datetime=${DATE}T23:59:59`,
    ];

    for (const url of dateFormats) {
        try {
            const result = await FrotcomClient.request<any>(url);
            const count = Array.isArray(result) ? result.length : 'object';
            const firstStarted = Array.isArray(result) && result.length > 0 ? result[0]?.started : '';
            const totalMileage = Array.isArray(result)
                ? result.reduce((s: number, t: any) => s + (t.mileageCanbus || 0), 0).toFixed(1)
                : '';
            console.log(`✅ ${url.split('?')[0].split('/').slice(-2).join('/')}?${url.split('?')[1] || ''}`);
            console.log(`   count=${count}, firstStarted=${firstStarted}, totalKm=${totalMileage}`);
        } catch (e: any) {
            const status = e.message.match(/\d{3}/)?.[0] || '???';
            console.log(`❌ ${url.split('?')[1] || url.split('/').slice(-1)[0]} → ${status}`);
        }
    }

    // Check what the ecodriving calculate returns in terms of "activity" field
    console.log('\n=== Full CB1783ME ecodriving record fields ===');
    const eco = await FrotcomClient.calculateEcodriving(`${DATE}T00:00:00`, `${DATE}T23:59:59`);
    const cb = eco.find((r: any) => r.licensePlate === 'CB1783ME');
    if (cb) {
        console.log('All fields:', JSON.stringify(cb, null, 2));
    }

    // Check the ecodriving calculate response metadata (is there pagination?)
    console.log('\n=== ecodriving calculate raw type ===');
    console.log('Type:', typeof eco, 'Is array:', Array.isArray(eco));
    console.log('Keys of response (if object):', typeof eco === 'object' && !Array.isArray(eco) ? Object.keys(eco) : 'N/A (array)');
}

checkTripsPagination().catch(console.error);
