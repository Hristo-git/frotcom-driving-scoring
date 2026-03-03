
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testGroupByDriver() {
    const frotcomId = 297309; // Kostadin

    try {
        const dates = ['2026-02-26', '2026-02-25'];

        for (const d of dates) {
            const start = `${d}T00:00:00`;
            const end = `${d}T23:59:59`;

            console.log(`\nTesting calculate with groupBy: 'driver' for ${d}...`);

            // FrotcomClient.calculateEcodriving (updated to use URL params already)
            const results = await FrotcomClient.calculateEcodriving(start, end, [frotcomId], undefined, 'driver');

            if (results.length === 0) {
                console.log('  No data returned.');
            } else {
                results.forEach((r, i) => {
                    console.log(`  Result: dist=${r.mileage}, score=${r.score}, driverId=${r.driverId}`);
                });
            }
        }

    } catch (err: any) {
        console.error('API Error:', err.message);
    }
}

testGroupByDriver();
