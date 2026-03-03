
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    const start = '2026-02-01';
    const end = '2026-02-28';
    const driverIds = [332926, 332929]; // Trajkovski, Stefanovski

    console.log(`Querying Frotcom API for month aggregate: ${start} to ${end}`);

    try {
        const results = await FrotcomClient.calculateEcodriving(start, end, driverIds);

        console.log("\nAPI RESULTS:");
        results.forEach((r: any) => {
            console.log(`\nDriver: ${r.driverName} (ID: ${r.driverId})`);
            console.log(`Score: ${r.score}`);
            console.log(`Mileage: ${r.mileage} km`);
            console.log(`Driving Time: ${r.drivingTime}s`);
            console.log(`Idle Time %: ${r.idleTimePerc}`);
            console.log(`High RPM %: ${r.highRPMPerc}`);
            // If the API returns more details, log them
            if (r.failingCriteria) console.log(`Failing Criteria: ${r.failingCriteria.join(', ')}`);
        });

    } catch (err) {
        console.error(err);
    }
}

main();
