
import { FrotcomClient, toFrotcomLocal } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyCalculateFixed() {
    const dId = 297309; // Kostadin
    const days = ['01', '02'];

    for (const d of days) {
        const date = `2026-03-${d}`;
        const s = `${date}T00:00:00`;
        const e = `${date}T23:59:59`;

        try {
            console.log(`--- Checking Calculate for ${dId} on ${date} (Using from/to) ---`);
            const from = toFrotcomLocal(s);
            const to = toFrotcomLocal(e);

            // Raw request to bypass the bug in lib/frotcom.ts
            const res = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
                from: from,
                to: to,
                driverIds: [dId],
                groupBy: 'driver'
            });

            const item = res.find(r => r.driverId === dId);
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
verifyCalculateFixed();
