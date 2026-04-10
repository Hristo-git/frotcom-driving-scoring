import { FrotcomClient } from '../lib/frotcom';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    const driverId = 282775; // Frotcom ID for Добромир Атанасов Димитров
    const start = '2026-03-01';
    const end = '2026-03-31';

    console.log(`Fetching official Frotcom score for driver ${driverId} from ${start} to ${end}...`);
    try {
        const results = await FrotcomClient.calculateEcodriving(start, end, [driverId]);
        const driverResult = results.find((r: any) => r.driverId === driverId);
        if (driverResult) {
            console.log('Driver Found:', JSON.stringify(driverResult, null, 2));
        } else {
            console.log('Driver not found in results. Available IDs:', results.map((r: any) => r.driverId).join(', '));
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
