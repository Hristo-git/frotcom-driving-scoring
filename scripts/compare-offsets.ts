
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function compareOffsets() {
    const frotcomId = 297309; // Kostadin

    try {
        const d = '2026-02-14'; // A Saturday, let's see
        const startNoOffset = `${d}T00:00:00`;
        const endNoOffset = `${d}T23:59:59`;

        console.log(`\nTesting calculate with NO OFFSETS for ${d}...`);
        const res1 = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: startNoOffset,
            to_datetime: endNoOffset,
            driverIds: [frotcomId]
        });
        console.log(`  Records: ${res1.length}`);
        if (res1.length > 0) console.log(`  Mileage: ${res1[0].mileage}`);

        const startWithOffset = `${d}T00:00:00+02:00`;
        const endWithOffset = `${d}T23:59:59+02:00`;

        console.log(`\nTesting calculate WITH OFFSETS (+02:00) for ${d}...`);
        const res2 = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: startWithOffset,
            to_datetime: endWithOffset,
            driverIds: [frotcomId]
        });
        console.log(`  Records: ${res2.length}`);
        if (res2.length > 0) console.log(`  Mileage: ${res2[0].mileage}`);

    } catch (err: any) {
        console.error('API Error:', err.message);
    }
}

compareOffsets();
