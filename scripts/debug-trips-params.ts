import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyTripsParams() {
    try {
        console.log(`Testing Trips API with 'from' and 'to' parameters instead of from_datetime...`);

        const vehicles = await FrotcomClient.request<any[]>('v2/vehicles', 'GET');
        const v = vehicles.find(x => x.licensePlate === 'CB1783ME');
        if (!v) return;

        let startD = new Date('2026-02-14T00:00:00Z');
        let endD = new Date('2026-02-14T23:59:59Z');

        const startTs = Math.floor(startD.getTime() / 1000);
        const endTs = Math.floor(endD.getTime() / 1000);

        console.log(`\nTesting 'from' and 'to' (Unix): ${startTs} - ${endTs}`);
        const trips1 = await FrotcomClient.request<any[]>(`v2/vehicles/${v.id}/trips?from=${startTs}&to=${endTs}`, 'GET');
        let sum1 = trips1 ? trips1.reduce((a, b) => a + (b.mileage || 0), 0) : 0;
        console.log(`-> Distance: ${sum1} km. Received ${trips1?.length} trips.`);

        console.log(`\nTesting 'from' and 'to' (ISO string):`);
        const trips2 = await FrotcomClient.request<any[]>(`v2/vehicles/${v.id}/trips?from=${startD.toISOString()}&to=${endD.toISOString()}`, 'GET');
        let sum2 = trips2 ? trips2.reduce((a, b) => a + (b.mileage || 0), 0) : 0;
        console.log(`-> Distance: ${sum2} km. Received ${trips2?.length} trips.`);

        console.log(`\nTesting 'start_date' and 'end_date' (Unix):`);
        const trips3 = await FrotcomClient.request<any[]>(`v2/vehicles/${v.id}/trips?start_date=${startTs}&end_date=${endTs}`, 'GET');
        let sum3 = trips3 ? trips3.reduce((a, b) => a + (b.mileage || 0), 0) : 0;
        console.log(`-> Distance: ${sum3} km. Received ${trips3?.length} trips.`);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

verifyTripsParams();
