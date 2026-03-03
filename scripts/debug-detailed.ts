
import { FrotcomClient, toFrotcomLocal } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugDetailed() {
    const vId = 340660;
    const dId = 297309;
    const date = '2026-02-01';
    const s = `${date}T00:00:00`;
    const e = `${date}T23:59:59`;

    try {
        console.log(`--- Checking results for ${date} (isDetailed: true) ---`);
        // We directly use the request method to pass isDetailed
        const token = await FrotcomClient.getAccessToken();
        const body = {
            from_datetime: toFrotcomLocal(s),
            to_datetime: toFrotcomLocal(e),
            driverIds: [dId],
            groupBy: 'driver',
            isDetailed: true
        };

        const res = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', body);
        console.log("Result:");
        console.log(JSON.stringify(res, null, 2));

    } catch (err) {
        console.error(err);
    }
}
debugDetailed();
