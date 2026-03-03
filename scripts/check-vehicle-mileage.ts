
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkVehicleMileage() {
    const vehicleId = 320164; // Assuming id from license plate СВ6285СE
    // I need to find the ID first
    try {
        const vehicles = await FrotcomClient.getVehicles();
        const v = vehicles.find(v => v.licensePlate === 'СВ6285СE');
        if (!v) {
            console.log("Vehicle СВ6285СE not found.");
            return;
        }
        console.log(`Found vehicle ${v.licensePlate} with ID ${v.id}`);

        const start = '2026-02-01T00:00:00';
        const end = '2026-02-28T23:59:59';

        const res = await FrotcomClient.calculateEcodriving(start, end, undefined, [v.id], 'vehicle');
        console.log("Vehicle February mileage:");
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
}
checkVehicleMileage();
