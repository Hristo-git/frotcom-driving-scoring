
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkCalculateVehicles() {
    const start = '2026-02-25T00:00:00';
    const end = '2026-02-25T23:59:59';
    const kostadinId = 297309;

    try {
        console.log(`Fetching calculate API grouped by vehicle for ${start}...`);
        // Empty driverIds, grouped by vehicle
        const results = await FrotcomClient.calculateEcodriving(start, end, undefined, undefined, 'vehicle');

        let kostadinVehicles = [];
        for (const res of (results || [])) {
            // driverId is present when grouped by vehicle, or sometimes driverIds array
            const dIds = res.driverIds || (res.driverId ? [res.driverId] : []);
            if (dIds.includes(kostadinId)) {
                kostadinVehicles.push({
                    vehicleId: res.vehicleId,
                    vehicleLicensePlate: res.vehicleLicensePlate,
                    score: res.score,
                    mileage: res.mileageCanbus || res.mileageGps
                });
            }
        }

        console.log(`Kostadin found as driver on ${kostadinVehicles.length} vehicles via calculate(vehicle):`, kostadinVehicles);

    } catch (err: any) {
        console.error(err.message);
    }
}
checkCalculateVehicles();
