
import { FrotcomClient, toFrotcomLocal } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyNikolai() {
    const dId = 292353; // Nikolai Shoshov
    const days = ['01', '02'];

    for (const d of days) {
        const date = `2026-03-${d}`;
        const s = `${date}T00:00:00`;
        const e = `${date}T23:59:59`;

        try {
            console.log(`--- Checking Nikolai for ${date} ---`);
            const resD = await FrotcomClient.calculateEcodriving(s, e, [dId], undefined, 'driver');
            const item = resD.find(r => r.driverId === dId);
            if (item) {
                console.log(`  RESULT: ${item.mileage || 0}km (Score: ${item.score || 'N/A'})`);
                console.log(`  Vehicles: ${JSON.stringify(item.vehicles)}`);
            } else {
                console.log("  RESULT: NOT_FOUND");
            }
        } catch (err) {
            console.error(err);
        }
    }
}
verifyNikolai();
