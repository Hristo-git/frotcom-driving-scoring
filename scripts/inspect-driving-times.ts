/**
 * Inspect the full response of /v2/drivers/drivingtimes/{driverId}
 * to see if it contains multi-day, historical data segmented by period.
 */
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DID = 308019; // Живко

async function run() {
    console.log('=== Full /v2/drivers/drivingtimes response ===\n');

    const data = await FrotcomClient.request<any>(`v2/drivers/drivingtimes/${DID}`);

    // Print full structure
    console.log(JSON.stringify(data, null, 2).slice(0, 3000));

    // Now fetch with specific date ranges
    console.log('\n=== With Feb 14 date range ===');
    const d14 = await FrotcomClient.request<any>(`v2/drivers/drivingtimes/${DID}?from_datetime=2026-02-14T00:00:00%2B02:00&to_datetime=2026-02-14T23:59:59%2B02:00`);
    console.log(JSON.stringify(d14, null, 2).slice(0, 2000));

    console.log('\n=== With Feb 25 date range ===');
    const d25 = await FrotcomClient.request<any>(`v2/drivers/drivingtimes/${DID}?from_datetime=2026-02-25T00:00:00%2B02:00&to_datetime=2026-02-25T23:59:59%2B02:00`);
    console.log(JSON.stringify(d25, null, 2).slice(0, 2000));

    // Look for any "europe" sub-array data
    if (data?.europe) {
        console.log('\n=== "europe" array structure ===');
        console.log('Length:', data.europe.length);
        if (data.europe.length > 0) {
            console.log('Keys of first item:', Object.keys(data.europe[0]));
            console.log('First item:', JSON.stringify(data.europe[0], null, 2));
            if (data.europe.length > 1) console.log('Second item:', JSON.stringify(data.europe[1], null, 2));
        }
    }
}

run().catch(console.error);
