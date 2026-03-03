
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkVehicleFeb() {
    const vId = 340660;
    const start = '2026-02-01T00:00:00';
    const end = '2026-02-28T23:59:59';

    try {
        const res = await FrotcomClient.calculateEcodriving(start, end, undefined, [vId], 'vehicle');
        const item = res.find(r => r.vehicleId === vId);
        if (item) {
            console.log(`VEHICLE_FEB_TOTAL: ${item.mileage}km`);
        } else {
            console.log("VEHICLE_FEB_TOTAL: NOT_FOUND");
        }
    } catch (err) {
        console.error(err);
    }
}
checkVehicleFeb();
