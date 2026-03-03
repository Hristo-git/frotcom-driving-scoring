
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testDriverEco() {
    const frotcomId = 297309;
    const start = '2026-02-25T00:00:00';
    const end = '2026-02-25T23:59:59';
    try {
        console.log(`Fetching ecodriving/driver for ${frotcomId} on ${start}`);
        const result = await FrotcomClient.getDriverEcodriving(frotcomId.toString(), start, end);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (err: any) {
        console.error('API Error:', err.message);
    }
}
testDriverEco();
