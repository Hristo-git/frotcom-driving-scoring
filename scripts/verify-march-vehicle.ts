
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyMarchVehicle() {
    try {
        const vehicles = await FrotcomClient.getVehicles();
        const v = vehicles.find(veh => veh.licensePlate === 'CB8568PE');
        if (!v) {
            console.log("Vehicle CB8568PE not found.");
            return;
        }
        const vId = v.id;
        const days = ['01', '02'];

        for (const d of days) {
            const date = `2026-03-${d}`;
            const s = `${date}T00:00:00`;
            const e = `${date}T23:59:59`;

            console.log(`--- Checking Vehicle ${vId} (CB8568PE) for ${date} ---`);
            const resV = await FrotcomClient.calculateEcodriving(s, e, undefined, [vId], 'vehicle');
            const item = resV.find(r => r.vehicleId === vId);
            if (item) {
                console.log(`  RESULT: ${item.mileage || 0}km`);
            } else {
                console.log("  RESULT: NOT_FOUND");
            }
        }
    } catch (err) {
        console.error(err);
    }
}
verifyMarchVehicle();
