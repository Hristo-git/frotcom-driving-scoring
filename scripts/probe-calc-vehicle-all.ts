
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkCalculateVehiclesExhaustive() {
    const start = '2026-02-01T00:00:00';
    const end = '2026-02-28T23:59:59';
    const kostadinId = 297309;

    try {
        console.log(`Fetching calculate API grouped by vehicle for February...`);
        // Group by vehicle, NO driver filter
        const results = await FrotcomClient.calculateEcodriving(start, end, undefined, undefined, 'vehicle');

        console.log(`Found ${results.length} vehicle summaries.`);

        let found = 0;
        for (const res of results) {
            // Some responses have driverId, some have driverIds
            const dIds = res.driverIds || (res.driverId ? [res.driverId] : []);
            if (dIds.includes(kostadinId)) {
                found++;
                console.log(`Kostadin found on vehicle ${res.vehicleLicensePlate} (${res.vehicleId}):`);
                console.log(`  Score: ${res.score}, Mileage: ${res.mileageCanbus || res.mileageGps}km`);
            }
        }

        if (found === 0) {
            console.log("Kostadin was NOT found in any vehicle-grouped results for Feb.");
        } else {
            console.log(`\nKostadin found on ${found} vehicles.`);
        }

    } catch (err: any) {
        console.error(err.message);
    }
}
checkCalculateVehiclesExhaustive();
