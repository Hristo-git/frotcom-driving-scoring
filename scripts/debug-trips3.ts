import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const VEHICLE_ID = 320225; // CB1783ME

async function checkTrips() {
    try {
        console.log('=== GET with from and to (unix seconds) ===');
        const fromTs = Math.floor(new Date('2026-02-14T00:00:00Z').getTime() / 1000);
        const toTs = Math.floor(new Date('2026-02-14T23:59:59Z').getTime() / 1000);
        const res1 = await FrotcomClient.request<any[]>(`v2/vehicles/${VEHICLE_ID}/trips?from=${fromTs}&to=${toTs}`);
        console.log(`Length: ${res1.length}, First trip: ${res1[0]?.started}`);

        console.log('\n=== GET with from and to (ISO) ===');
        const res2 = await FrotcomClient.request<any[]>(`v2/vehicles/${VEHICLE_ID}/trips?from=2026-02-14T00:00:00&to=2026-02-14T23:59:59`);
        console.log(`Length: ${res2.length}, First trip: ${res2[0]?.started}`);

        console.log('\n=== POST with JSON body ===');
        const res3 = await FrotcomClient.request<any[]>(`v2/vehicles/${VEHICLE_ID}/trips`, 'POST', {
            from_datetime: '2026-02-14T00:00:00',
            to_datetime: '2026-02-14T23:59:59'
        });
        console.log(`Length: ${res3.length}, First trip: ${res3[0]?.started}`);
    } catch (e: any) {
        console.log('Error:', e.message);
    }
}

checkTrips();
