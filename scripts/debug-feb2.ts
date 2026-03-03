
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugFeb2() {
    const vId = 340660;
    const dId = 297309;
    const date = '2026-02-02';
    const s = `${date}T00:00:00`;
    const e = `${date}T23:59:59`;

    try {
        console.log(`--- Checking results for ${date} ---`);
        const resV = await FrotcomClient.calculateEcodriving(s, e, undefined, [vId], 'vehicle');
        const vItem = resV.find(r => r.vehicleId === vId);
        console.log(`VEHICLE: ${vItem ? vItem.mileage : 'N/A'}km`);

        const resD = await FrotcomClient.calculateEcodriving(s, e, [dId], undefined, 'driver');
        const dItem = resD.find(r => r.driverId === dId);
        console.log(`DRIVER: ${dItem ? dItem.mileage : 'N/A'}km`);
    } catch (err) {
        console.error(err);
    }
}
debugFeb2();
