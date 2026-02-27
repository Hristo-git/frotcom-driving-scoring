import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkPureApi() {
    try {
        console.log(`Checking Feb 14 completely unfiltered...`);

        const start = '2026-02-14T00:00:00';
        const end = '2026-02-14T23:59:59';

        let allData = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: start,
            to_datetime: end
        });

        console.log(`Received ${allData.length} records.`);

        let targetVehicleData = allData.filter(d =>
            d.licensePlate === 'CB1783ME' ||
            (d.driverName && d.driverName.includes('Живко')) ||
            (d.drivers && d.drivers.some((n: string) => n.includes('Живко')))
        );

        console.log(`\nFiltered records for Zhivko / CB1783ME: ${targetVehicleData.length}`);

        targetVehicleData.forEach((d, i) => {
            console.log(`\nRecord ${i + 1}:`);
            console.dir(d, { depth: null });
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkPureApi();
