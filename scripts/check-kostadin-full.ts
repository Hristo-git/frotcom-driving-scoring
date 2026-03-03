
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkKostadinFullMonth() {
    const driverId = 297309;
    const start = '2026-02-01T00:00:00';
    const end = '2026-02-28T23:59:59';

    try {
        console.log(`Checking Kostadin full month calculate...`);
        const res = await FrotcomClient.calculateEcodriving(start, end, [driverId], undefined, 'driver');
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
}
checkKostadinFullMonth();
