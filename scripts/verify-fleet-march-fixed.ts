
import { FrotcomClient, toFrotcomLocal } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyFleetMarch2() {
    const date = '2026-03-02';
    const s = `${date}T00:00:00`;
    const e = `${date}T23:59:59`;

    try {
        console.log(`--- Checking Fleet for ${date} (Using from/to) ---`);
        const from = toFrotcomLocal(s);
        const to = toFrotcomLocal(e);

        const res = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from: from,
            to: to,
            groupBy: 'driver'
        });

        console.log(`Total drivers with activity: ${res.length}`);
        if (res.length > 0) {
            // Pick a few and see if their mileage makes sense
            for (let i = 0; i < Math.min(5, res.length); i++) {
                console.log(`  Driver: ${res[i].driverName}, Mileage: ${res[i].mileage}km, Score: ${res[i].score}`);
            }
        }
    } catch (err) {
        console.error(err);
    }
}
verifyFleetMarch2();
