import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkFilterObject() {
    try {
        console.log(`Testing { filter: { from, to } } payload structure...`);

        const startIso = '2026-02-14T00:00:00';
        const endIso = '2026-02-14T23:59:59';
        const startTs = Math.floor(new Date('2026-02-14T00:00:00Z').getTime() / 1000);
        const endTs = Math.floor(new Date('2026-02-14T23:59:59Z').getTime() / 1000);

        const variations = [
            {
                name: 'Filter with ISO',
                body: { filter: { from: startIso, to: endIso, driverIds: [308019], groupBy: 'driver' } }
            },
            {
                name: 'Filter with Unix',
                body: { filter: { from: startTs, to: endTs, driverIds: [308019], groupBy: 'driver' } }
            },
            {
                name: 'Dates in filter, groupBy root',
                body: { filter: { from: startIso, to: endIso, driverIds: [308019] }, groupBy: 'driver' }
            },
            {
                name: 'Dates in filter, no groupBy',
                body: { filter: { from: startIso, to: endIso, driverIds: [308019] } }
            }
        ];

        for (const test of variations) {
            console.log(`\n\n--- Testing ${test.name} ---`);
            let data = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', test.body);

            if (data && data.length > 0) {
                const zhivko = data.find(d => d.driverId === 308019 || (d.driversId && d.driversId.includes(308019)));
                console.log(`Zhivko Record returned mileage: ${zhivko?.mileage}`);
                if (zhivko?.mileage && zhivko.mileage > 450) {
                    console.log(`!!! SUCCESS !!! 463km match found!`);
                    console.dir(zhivko, { depth: null });
                }
            } else {
                console.log(`No records returned!`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkFilterObject();
