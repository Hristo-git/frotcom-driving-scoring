
import { FrotcomClient, toFrotcomLocal } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function findKostadinSpecificDays() {
    const driverId = 297309;
    const start = '2026-02-01T00:00:00';
    const end = '2026-02-28T23:59:59';

    try {
        console.log(`Checking Kostadin daily calculate for Feb...`);
        // We iterate day by day to see which days he has > 0 mileage
        for (let day = 1; day <= 28; day++) {
            const date = `2026-02-${String(day).padStart(2, '0')}`;
            const s = `${date}T00:00:00`;
            const e = `${date}T23:59:59`;

            const res = await FrotcomClient.calculateEcodriving(s, e, [driverId], undefined, 'driver');
            if (res.length > 0 && (res[0].mileage > 0)) {
                console.log(`${date}: Mileage ${res[0].mileage}km, Vehicles: ${res[0].vehicles?.join(', ')}`);
            }
        }
    } catch (e) {
        console.error(e);
    }
}
findKostadinSpecificDays();
