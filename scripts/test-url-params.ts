
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyUrlParams() {
    const kostadinId = 615; // From previous probe

    try {
        const dates = ['2026-02-26', '2026-02-25'];

        for (const d of dates) {
            const start = `${d}T00:00:00`;
            const end = `${d}T23:59:59`;

            console.log(`\nProbing Frotcom for ${d} (USING URL PARAMS)...`);

            // Try in URL
            const url = `v2/ecodriving/calculate?from_datetime=${encodeURIComponent(start)}&to_datetime=${encodeURIComponent(end)}`;
            const results = await FrotcomClient.request<any[]>(url, 'POST', {
                driverIds: [kostadinId]
            });

            const kostadinData = results.filter(r => r.driversId && r.driversId.includes(kostadinId));

            if (kostadinData.length === 0) {
                console.log('  No data returned for Kostadin.');
            } else {
                kostadinData.forEach((r, i) => {
                    console.log(`  [${d}] dist=${r.mileageCanbus || r.mileageGps}, score=${r.score}, drivers=${JSON.stringify(r.driversId)}`);
                });
            }
        }

    } catch (err) {
        console.error(err);
    }
}

verifyUrlParams();
