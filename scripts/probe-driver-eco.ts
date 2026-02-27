
import * as dotenv from 'dotenv';
import { FrotcomClient } from '../lib/frotcom.js';

dotenv.config({ path: '.env.local' });

async function run() {
    // Yordan Angelov - Русе
    const driverFId = '336635';
    const start = '2026-02-25T00:00:00';
    const end = '2026-02-25T23:59:59';

    console.log(`Fetching driver ecodriving for ${driverFId} from ${start} to ${end}`);
    try {
        const data = await FrotcomClient.getDriverEcodriving(driverFId, start, end);
        console.log('Data returned:');
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}

run().catch(console.error);
