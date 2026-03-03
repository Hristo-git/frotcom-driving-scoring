
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testDriverEco() {
    const frotcomId = 297309; // Kostadin

    try {
        const dates = ['2026-02-26', '2026-02-25'];

        for (const d of dates) {
            const start = `${d}T00:00:00`;
            const end = `${d}T23:59:59`;

            console.log(`\nTesting GET v2/drivers/${frotcomId}/ecodriving for ${d}...`);

            const url = `v2/drivers/${frotcomId}/ecodriving?from_datetime=${encodeURIComponent(start)}&to_datetime=${encodeURIComponent(end)}`;
            const data = await FrotcomClient.request<any>(url, 'GET');

            if (!data) {
                console.log('  No data returned.');
            } else {
                console.log(`  Result: dist=${data.mileage}, score=${data.score}`);
                console.dir(data, { depth: null });
            }
        }

    } catch (err: any) {
        console.error('API Error:', err.message);
    }
}

testDriverEco();
