import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkDriverVehicle() {
    try {
        console.log(`Testing groupBy: 'driver_vehicle' for Feb 14...`);

        const start = '2026-02-14T00:00:00';
        const end = '2026-02-14T23:59:59';

        let targetData = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: start,
            to_datetime: end,
            driverIds: [308019],
            groupBy: 'driver_vehicle'
        });

        console.log(`\nRecords returned: ${targetData.length}`);

        targetData.forEach((d, i) => {
            console.log(`\nRecord ${i + 1}:`);
            console.dir(d, { depth: null });
        });

        // Test Jan 1 to see if it varies, proving it respects dates
        let janData = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: '2026-01-01T00:00:00',
            to_datetime: '2026-01-01T23:59:59',
            driverIds: [308019],
            groupBy: 'driver_vehicle'
        });

        console.log(`\nJan 1 records returned: ${janData.length}`);
        if (janData.length > 0) {
            console.log(`Jan 1 Mileage Record 1: ${janData[0].mileage}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkDriverVehicle();
