
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const VEHICLE_ID = 320225; // CB1783ME
const DATE = '2026-02-14';

async function discoverEndpoints() {
    console.log('=== Testing Frotcom API endpoints for vehicle trip data ===\n');

    const endpoints: Array<{ path: string; method: string; body?: any }> = [
        // Vehicle trips with date range (GET with query params)
        { path: `v2/vehicles/${VEHICLE_ID}/trips?from_datetime=${DATE}T00:00:00&to_datetime=${DATE}T23:59:59`, method: 'GET' },
        { path: `v2/vehicles/${VEHICLE_ID}/trips?from=${DATE}&to=${DATE}`, method: 'GET' },
        { path: `v2/vehicles/${VEHICLE_ID}/trips?date=${DATE}`, method: 'GET' },
        // Activity
        { path: `v2/vehicles/${VEHICLE_ID}/activity?from_datetime=${DATE}T00:00:00&to_datetime=${DATE}T23:59:59`, method: 'GET' },
        { path: `v2/vehicles/${VEHICLE_ID}/activities?from_datetime=${DATE}T00:00:00&to_datetime=${DATE}T23:59:59`, method: 'GET' },
        // Odometer history
        { path: `v2/vehicles/${VEHICLE_ID}/odometer`, method: 'GET' },
        { path: `v2/vehicles/${VEHICLE_ID}/odometer?from_datetime=${DATE}T00:00:00&to_datetime=${DATE}T23:59:59`, method: 'GET' },
        // Daily summary
        { path: `v2/vehicles/${VEHICLE_ID}/daily?from_datetime=${DATE}T00:00:00&to_datetime=${DATE}T23:59:59`, method: 'GET' },
        { path: `v2/vehicles/${VEHICLE_ID}/summary?from_datetime=${DATE}T00:00:00&to_datetime=${DATE}T23:59:59`, method: 'GET' },
        // Driver trips
        { path: `v2/drivers/308019/trips?from_datetime=${DATE}T00:00:00&to_datetime=${DATE}T23:59:59`, method: 'GET' },
        { path: `v2/drivers/308019/activity?from_datetime=${DATE}T00:00:00&to_datetime=${DATE}T23:59:59`, method: 'GET' },
        // Generic trips endpoints
        { path: `v2/trips?vehicleId=${VEHICLE_ID}&from_datetime=${DATE}T00:00:00&to_datetime=${DATE}T23:59:59`, method: 'GET' },
        { path: `v2/trips?from_datetime=${DATE}T00:00:00&to_datetime=${DATE}T23:59:59&vehicleIds=${VEHICLE_ID}`, method: 'GET' },
        // POSTs
        { path: `v2/vehicles/trips`, method: 'POST', body: { from_datetime: `${DATE}T00:00:00`, to_datetime: `${DATE}T23:59:59`, vehicleIds: [VEHICLE_ID] } },
        { path: `v2/vehicles/activity`, method: 'POST', body: { from_datetime: `${DATE}T00:00:00`, to_datetime: `${DATE}T23:59:59`, vehicleIds: [VEHICLE_ID] } },
        // ecodriving related
        { path: `v2/ecodriving/ranking?from_datetime=${DATE}T00:00:00&to_datetime=${DATE}T23:59:59`, method: 'GET' },
        { path: `v2/ecodriving/details?from_datetime=${DATE}T00:00:00&to_datetime=${DATE}T23:59:59&driverId=308019`, method: 'GET' },
    ];

    for (const ep of endpoints) {
        try {
            const result = await FrotcomClient.request<any>(ep.path, ep.method, ep.body);
            const preview = JSON.stringify(result).slice(0, 200);
            const count = Array.isArray(result) ? `[${result.length} items]` : '';
            console.log(`✅ ${ep.method} ${ep.path.split('?')[0]} ${count}`);
            console.log(`   ${preview}\n`);
        } catch (e: any) {
            const status = e.message.includes('404') ? '404' : e.message.includes('405') ? '405' : e.message.includes('400') ? '400' : '???';
            console.log(`❌ ${ep.method} ${ep.path.split('?')[0]} → ${status}`);
        }
    }
}

discoverEndpoints().catch(console.error);
