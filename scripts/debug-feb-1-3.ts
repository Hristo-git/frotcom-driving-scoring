
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugFeb() {
    const vId = 340660;
    const dId = 297309;

    for (const d of ['01', '02', '03']) {
        const date = `2026-02-${d}`;
        const s = `${date}T00:00:00`;
        const e = `${date}T23:59:59`;

        try {
            console.log(`--- Results for ${date} ---`);
            const resV = await FrotcomClient.calculateEcodriving(s, e, undefined, [vId], 'vehicle');
            const vItem = resV.find(r => r.vehicleId === vId);
            console.log(`VEHICLE: ${vItem ? vItem.mileage : 'N/A'}km`);

            const resD = await FrotcomClient.calculateEcodriving(s, e, [dId], undefined, 'driver');
            const dItem = resD.find(r => r.driverId === dId);
            console.log(`DRIVER: ${dItem ? (dItem.mileage || 0) : 'N/A'}km`);
            if (dItem && dItem.hasLowMileage) console.log("  (hasLowMileage: true)");
        } catch (err) {
            console.error(err);
        }
    }
}
debugFeb();
