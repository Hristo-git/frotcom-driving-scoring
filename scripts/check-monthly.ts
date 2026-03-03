
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkMonthlyCalculate() {
    const start = '2026-02-01T00:00:00';
    const end = '2026-02-28T23:59:59';
    try {
        console.log(`Fetching monthly calculate: ${start} - ${end}`);
        const results = await FrotcomClient.calculateEcodriving(start, end, undefined, undefined, 'driver');
        const kRecord = results.find(r => r.driverId === 297309);
        if (kRecord) {
            console.log("Found Kostadin in monthly summary:");
            console.log(JSON.stringify(kRecord, null, 2));
        } else {
            console.log("Kostadin not found in monthly summary!");
        }
    } catch (e: any) {
        console.error(e.message);
    }
}
checkMonthlyCalculate();
