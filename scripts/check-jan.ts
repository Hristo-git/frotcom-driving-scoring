
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkJan() {
    const vId = 340660;
    const date = '2026-01-15';
    const s = `${date}T00:00:00`;
    const e = `${date}T23:59:59`;

    try {
        console.log(`--- Checking results for ${date} ---`);
        const resV = await FrotcomClient.calculateEcodriving(s, e, undefined, [vId], 'vehicle');
        const vItem = resV.find(r => r.vehicleId === vId);
        console.log(`VEHICLE: ${vItem ? vItem.mileage : 'N/A'}km`);

        // Also check if there's a different month
        const resVFull = await FrotcomClient.calculateEcodriving('2026-01-01T00:00:00', '2026-01-31T23:59:59', undefined, [vId], 'vehicle');
        const vFullItem = resVFull.find(r => r.vehicleId === vId);
        console.log(`JAN_TOTAL: ${vFullItem ? vFullItem.mileage : 'N/A'}km`);

    } catch (err) {
        console.error(err);
    }
}
checkJan();
