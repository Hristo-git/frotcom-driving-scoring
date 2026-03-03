
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testGroupByDay() {
    const frotcomId = 308019; // Zhivko

    try {
        const start = '2026-02-01T00:00:00';
        const end = '2026-02-28T23:59:59';

        console.log(`\nTesting calculate with groupBy: 'day' for all of February...`);

        const results = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: start,
            to_datetime: end,
            driverIds: [frotcomId],
            groupBy: 'day'
        });

        console.log(`  Received ${results.length} records.`);
        if (results.length > 0) {
            results.slice(0, 5).forEach(r => {
                console.log(`  - Date: ${r.date}, Mileage: ${r.mileage}, Score: ${r.score}`);
            });
        }

    } catch (err: any) {
        console.error('API Error:', err.message);
    }
}

testGroupByDay();
