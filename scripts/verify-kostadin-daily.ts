
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyKostadinDaily() {
    const frotcomId = 297309; // Kostadin

    try {
        const date = '2026-02-25';
        const start = `${date}T00:00:00`;
        const end = `${date}T23:59:59`;

        console.log(`\nVerifying Kostadin for ${date} with groupBy: 'driver'...`);

        const results = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: start,
            to_datetime: end,
            driverIds: [frotcomId],
            groupBy: 'driver'
        });

        console.log(`Results length: ${results.length}`);
        if (results.length > 0) {
            const r = results[0];
            console.log(`  Mileage: ${r.mileage}, Score: ${r.score}, Customized: ${r.scoreCustomized}`);
            console.log(`  Full record:`, JSON.stringify(r));
        } else {
            console.log('  No results found. Maybe he didn\'t drive or dates are still ignored?');
        }

    } catch (err: any) {
        console.error('API Error:', err.message);
    }
}

verifyKostadinDaily();
