
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testUnixParams() {
    try {
        console.log('Testing v2/ecodriving/calculate with from/to UNIX TIMESTAMPS...');

        const date1 = '2026-02-14';
        const date2 = '2026-02-28';

        for (const d of [date1, date2]) {
            // Sofia is UTC+2, so 00:00 Sofia = 22:00 UTC previous day
            const startUnix = Math.floor(new Date(`${d}T00:00:00+02:00`).getTime() / 1000);
            const endUnix = Math.floor(new Date(`${d}T23:59:59+02:00`).getTime() / 1000);

            console.log(`\n--- Fetching ${d} (Unix: ${startUnix} - ${endUnix}) ---`);
            const data = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
                from: startUnix,
                to: endUnix
            });

            const sum = data.reduce((acc, r) => acc + (r.mileage || 0), 0);
            console.log(`  Fleet Mileage: ${sum.toFixed(2)} km (${data.length} records)`);
        }

    } catch (err: any) {
        console.error('API Error:', err.message);
    }
}

testUnixParams();
