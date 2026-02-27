
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testDriverEndpoint() {
    const frotcomId = '308019'; // Живко Георгиев Иванов - Петрич

    // Try the per-driver endpoint
    console.log('=== v2/ecodriving/driver endpoint ===');
    try {
        const result = await FrotcomClient.getDriverEcodriving(
            frotcomId,
            '2026-02-14T00:00:00',
            '2026-02-14T23:59:59'
        );
        console.log('Response:', JSON.stringify(result, null, 2));
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    // Also try with local time (UTC+2) since the Frotcom UI might use local time
    console.log('\n=== v2/ecodriving/driver with local time (UTC+2 = previous day 22:00 UTC) ===');
    try {
        const result2 = await FrotcomClient.getDriverEcodriving(
            frotcomId,
            '2026-02-13T22:00:00', // 00:00 local (UTC+2)
            '2026-02-14T21:59:59'  // 23:59 local (UTC+2)
        );
        console.log('Response:', JSON.stringify(result2, null, 2));
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    // Try calculateEcodriving with this specific driver ID to see if we get different results
    console.log('\n=== calculateEcodriving filtered by driverId=308019 ===');
    try {
        const result3 = await FrotcomClient.calculateEcodriving(
            '2026-02-14T00:00:00',
            '2026-02-14T23:59:59',
            [308019]
        );
        console.log('Records returned:', result3.length);
        result3.forEach((r: any) => {
            // console.log(JSON.stringify({ ... }));
        });
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    // Also try with local time for the calculateEcodriving
    console.log('\n=== calculateEcodriving driverId=308019 with local time ===');
    try {
        const result4 = await FrotcomClient.calculateEcodriving(
            '2026-02-13T22:00:00', // Local 00:00 UTC+2
            '2026-02-14T21:59:59', // Local 23:59 UTC+2
            [308019]
        );
        console.log('Records returned:', result4.length);
        result4.forEach((r: any) => {
            // console.log(JSON.stringify({ ... }));
        });
    } catch (e: any) {
        console.log('Error:', e.message);
    }
}

testDriverEndpoint().catch(console.error);
