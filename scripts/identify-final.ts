
import { FrotcomClient, toFrotcomLocal } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function identify297309() {
    try {
        const drivers = await FrotcomClient.getDrivers();
        const d = drivers.find(drv => drv.id === 297309);
        if (d) {
            console.log(`Driver ID 297309 is: ${d.name}`);
        } else {
            console.log("Driver ID 297309 not found in current fleet.");
        }

        // Also check Nikolai Shoshov (292353) for March 2nd
        const date = '2026-03-02';
        const res = await FrotcomClient.calculateEcodriving(`${date}T00:00:00`, `${date}T23:59:59`, [292353], undefined, 'driver');
        const item = res.find(r => r.driverId === 292353);
        console.log(`Nikolai Shoshov (292353) on ${date}: ${item ? item.mileage : 'NOT_FOUND'}km`);

    } catch (err) {
        console.error(err);
    }
}
identify297309();
