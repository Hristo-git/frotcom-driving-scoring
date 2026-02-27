import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyGroupByBug() {
    console.log(`Verifying if groupBy='driver' causes Frotcom to ignore dates...`);
    try {
        const start = '2026-02-14T00:00:00';
        const end = '2026-02-14T23:59:59';

        // 1. Fetch WITHOUT groupBy for a specific driver
        console.log('\n--- 1. Fetching NO GROUP BY for Zhivko on Feb 14 ---');
        const resNoGroup = await FrotcomClient.calculateEcodriving(start, end, [308019], undefined, undefined);
        console.log(`Mileage without group: ${resNoGroup[0]?.mileage} km`);

        // 2. Fetch WITH groupBy for a specific driver
        console.log('\n--- 2. Fetching GROUP BY DRIVER for Zhivko on Feb 14 ---');
        const resGroup = await FrotcomClient.calculateEcodriving(start, end, [308019], undefined, 'driver');
        console.log(`Mileage with group: ${resGroup[0]?.mileage} km`);

        // 3. Fetch WITH groupBy for Jan 1
        console.log('\n--- 3. Fetching GROUP BY DRIVER for Zhivko on JAN 1 ---');
        const resJanGroup = await FrotcomClient.calculateEcodriving('2026-01-01T00:00:00', '2026-01-01T23:59:59', [308019], undefined, 'driver');
        console.log(`Mileage Jan 1 with group: ${resJanGroup[0]?.mileage} km`);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

verifyGroupByBug();
