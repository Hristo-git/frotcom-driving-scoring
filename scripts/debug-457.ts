
import { FrotcomClient, toFrotcomLocal } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debug457() {
    const driverId = 297309;
    const date = '2026-02-01';
    const s = `${date}T00:00:00`;
    const e = `${date}T23:59:59`;

    try {
        console.log(`Checking Kostadin on ${date}...`);
        const resD = await FrotcomClient.calculateEcodriving(s, e, [driverId], undefined, 'driver');
        console.log("Driver calculate for Kostadin:");
        console.log(JSON.stringify(resD, null, 2));

        if (resD.length > 0 && resD[0].vehicles) {
            const licensePlate = resD[0].vehicles[0];
            console.log(`Searching for vehicle ID for ${licensePlate}...`);
            const vehicles = await FrotcomClient.getVehicles();
            const v = vehicles.find(veh => veh.licensePlate === licensePlate);
            if (v) {
                console.log(`Found ID: ${v.id}. Checking vehicle distance for same day...`);
                const resV = await FrotcomClient.calculateEcodriving(s, e, undefined, [v.id], 'vehicle');
                console.log("Vehicle calculate:");
                console.log(JSON.stringify(resV, null, 2));
            }
        }
    } catch (err) {
        console.error(err);
    }
}
debug457();
