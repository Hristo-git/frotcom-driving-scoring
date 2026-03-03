
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testEcoProfile() {
    const frotcomId = 336635; // Yordan Angelov (Top driver in my check-fleet list)

    try {
        const date = '2026-02-25';
        const start = `${date}T00:00:00`;
        const end = `${date}T23:59:59`;

        console.log(`\nTesting calculate for ${date} with DIFFERENT ecoProfileIds...`);

        const profiles = [undefined, 4];

        for (const pid of profiles) {
            console.log(`\n--- Profile: ${pid ?? 'DEFAULT'} ---`);
            const results = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
                from_datetime: start,
                to_datetime: end,
                driverIds: [frotcomId],
                groupBy: 'driver',
                ecoProfileId: pid
            });

            if (results.length > 0) {
                console.log(`  Score: ${results[0].score}, Distance: ${results[0].mileage}`);
            } else {
                console.log('  No data.');
            }
        }

    } catch (err: any) {
        console.error('API Error:', err.message);
    }
}

testEcoProfile();
