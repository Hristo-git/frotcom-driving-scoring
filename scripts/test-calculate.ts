
import path from 'path';
import dotenv from 'dotenv';
import { FrotcomClient } from '../lib/frotcom';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testCalculate() {
    const driverId = 330674;
    const start = '2026-02-01T00:00:00';
    const end = '2026-02-07T23:59:59';

    const body = {
        from_datetime: start,
        to_datetime: end,
        driverIds: [driverId]
    };

    try {
        console.log('Testing: POST v2/ecodriving/calculate');
        // @ts-ignore
        const data = await FrotcomClient.request('v2/ecodriving/calculate', 'POST', body);
        console.log('Success:', JSON.stringify(data, null, 2));
    } catch (e: any) {
        console.log('Failed:', e.message);
    }
}

testCalculate();
