
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testGetDriverEco() {
    const frotcomId = 297309; // Kostadin

    try {
        const dates = ['2026-02-26', '2026-02-25'];

        for (const d of dates) {
            const start = `${d}T00:00:00`;
            const end = `${d}T23:59:59`;

            console.log(`\nTesting GET /v2/ecodriving/driver for ${d}...`);

            // Note: FrotcomClient.getDriverEcodriving exists in lib/frotcom.ts
            const data = await FrotcomClient.getDriverEcodriving(String(frotcomId), start, end);

            if (!data) {
                console.log('  No data returned.');
            } else {
                console.log(`  Result: dist=${data.mileage}, score=${data.score}`);
            }
        }

    } catch (err: any) {
        console.error('API Error:', err.message);
    }
}

testGetDriverEco();
