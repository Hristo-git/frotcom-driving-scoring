import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
    const start = '2026-02-14T00:00:00';
    const end = '2026-02-14T23:59:59';
    console.log(`Testing Feb 14 for Zhivko...`);

    try {
        // Test 1: Just driverId, NO groupBy
        console.log('\n--- Test 1. No groupBy, driverId = 308019 ---');
        const res1 = await FrotcomClient.calculateEcodriving(start, end, [308019], undefined, undefined);
        console.dir(res1, { depth: null });

        // Test 2: driverId + groupBy driver
        console.log('\n--- Test 2. groupBy=driver, driverId = 308019 ---');
        const res2 = await FrotcomClient.calculateEcodriving(start, end, [308019], undefined, 'driver');
        console.dir(res2, { depth: null });

        // Test 3: vehicleId for CB1783ME (Need to find its ID... let's just use getVehicles)
        const vehicles = await FrotcomClient.request<any[]>('v2/vehicles', 'GET');
        const v = vehicles.find(x => x.licensePlate === 'CB1783ME');
        if (v) {
            console.log(`\n--- Test 3. No groupBy, vehicleId = ${v.id} ---`);
            const res3 = await FrotcomClient.calculateEcodriving(start, end, undefined, [v.id], undefined);
            console.dir(res3, { depth: null });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
runTest();
