import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function findCorrectDateParam() {
    console.log(`Brute-forcing date parameter names for Frotcom API to find Zhivko's 463km on Feb 14...`);

    const start = '2026-02-14T00:00:00';
    const end = '2026-02-14T23:59:59';
    const startUnix = Math.floor(new Date('2026-02-14T00:00:00Z').getTime() / 1000);
    const endUnix = Math.floor(new Date('2026-02-14T23:59:59Z').getTime() / 1000);

    const payloadsToTest = [
        { name: '1. from_datetime (Current)', payload: { from_datetime: start, to_datetime: end } },
        { name: '2. from / to', payload: { from: startUnix, to: endUnix } },
        { name: '3. fromDate / toDate', payload: { fromDate: start, toDate: end } },
        { name: '4. startDate / endDate', payload: { startDate: start, endDate: end } },
        { name: '5. period_start / period_end', payload: { period_start: start, period_end: end } },
        { name: '6. fromDate / toDate (Unix)', payload: { fromDate: startUnix, toDate: endUnix } },
        { name: '7. from_date / to_date', payload: { from_date: start, to_date: end } }
    ];

    try {
        for (const test of payloadsToTest) {
            console.log(`\nTesting ${test.name}:`, test.payload);
            const body = {
                ...test.payload,
                driverIds: [308019],
                groupBy: 'driver'
            };

            const data = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', body);

            if (data && data.length > 0) {
                const zhivko = data[0];
                console.log(`-> Returned Mileage: ${zhivko.mileage}`);
                if (zhivko.mileage !== 18.89999999999418 && zhivko.mileage > 50) {
                    console.log('!!! SUCCESS !!! This parameter format worked!');
                }
            } else {
                console.log('-> No data returned');
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findCorrectDateParam();
