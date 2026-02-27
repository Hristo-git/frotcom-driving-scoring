import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyParameters() {
    try {
        console.log(`Testing parameter configurations to find WHICH one respects dates for Zhivko (ID 308019)...`);

        const start = '2026-02-14T00:00:00';
        const end = '2026-02-14T23:59:59';

        console.log('\n1. ALL DRIVERS, NO GROUP BY');
        let data1 = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: start, to_datetime: end
        });
        if (data1) {
            let zhivkoRecs = data1.filter(d => d.driverId === 308019 || (d.driversId && d.driversId.includes(308019)));
            let sum = zhivkoRecs.reduce((a, b) => a + (b.mileage || 0), 0);
            console.log(`Zhivko combined mileage: ${sum}`);
        }

        console.log('\n2. ZHIVKO ONLY, NO GROUP BY');
        let data2 = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: start, to_datetime: end, driverIds: [308019]
        });
        if (data2) {
            let sum = data2.reduce((a, b) => a + (b.mileage || 0), 0);
            console.log(`Zhivko combined mileage: ${sum}`);
        }

        console.log('\n3. ALL DRIVERS, GROUP BY DRIVER_VEHICLE');
        let data3 = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: start, to_datetime: end, groupBy: 'driver_vehicle'
        });
        if (data3) {
            let zhivkoRecs = data3.filter(d => d.driverId === 308019 || (d.driversId && d.driversId.includes(308019)));
            let sum = zhivkoRecs.reduce((a, b) => a + (b.mileage || 0), 0);
            console.log(`Zhivko combined mileage: ${sum}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

verifyParameters();
