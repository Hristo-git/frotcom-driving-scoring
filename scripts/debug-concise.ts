
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugConcise() {
    const vId = 340660;
    const date = '2026-02-01';
    const s = `${date}T00:00:00`;
    const e = `${date}T23:59:59`;

    try {
        const resV = await FrotcomClient.calculateEcodriving(s, e, undefined, [vId], 'vehicle');
        const item = resV.find(r => r.vehicleId === vId);
        if (item) {
            console.log(`VEHICLE_RESULT: ${item.mileage}km`);
        } else {
            console.log("VEHICLE_RESULT: NOT_FOUND");
        }
    } catch (err) {
        console.error(err);
    }
}
debugConcise();
