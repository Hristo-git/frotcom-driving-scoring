import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest2() {
    console.log(`Getting vehicle trips for CB1783ME on Feb 13 and Feb 14...`);

    try {
        const vehicles = await FrotcomClient.request<any[]>('v2/vehicles', 'GET');
        const v = vehicles.find(x => x.licensePlate === 'CB1783ME');
        if (!v) {
            console.log('Vehicle CB1783ME not found.');
            return;
        }

        console.log(`Vehicle ID: ${v.id}`);

        const startTs = Math.floor(new Date('2026-02-13T00:00:00Z').getTime() / 1000);
        const endTs = Math.floor(new Date('2026-02-14T23:59:59Z').getTime() / 1000);

        const trips = await FrotcomClient.request<any[]>(`v2/vehicles/${v.id}/trips?from_datetime=${startTs}&to_datetime=${endTs}`, 'GET');

        console.log(`Found ${trips.length} trips between Feb 13 and Feb 14.`);
        if (trips.length > 0) {
            console.log('Sample Trip Object 0:');
            console.dir(trips[0], { depth: null });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
runTest2();
