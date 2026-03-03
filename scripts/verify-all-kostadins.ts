
import { FrotcomClient, toFrotcomLocal } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyAllKostadins() {
    const kIds = [333530, 404494, 308028];
    const date = '2026-03-02';
    const s = `${date}T00:00:00`;
    const e = `${date}T23:59:59`;

    try {
        console.log(`--- Checking all Kostadins for ${date} (Using from/to) ---`);
        for (const dId of kIds) {
            const res = await FrotcomClient.calculateEcodriving(s, e, [dId], undefined, 'driver');
            const item = res.find(r => r.driverId === dId);
            if (item) {
                console.log(`  Driver ID ${dId} (${item.driverName}): ${item.mileage || 0}km`);
            } else {
                console.log(`  Driver ID ${dId}: NOT_FOUND`);
            }
        }
    } catch (err) {
        console.error(err);
    }
}
verifyAllKostadins();
