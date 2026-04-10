import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
import { FrotcomClient } from '../lib/frotcom';

async function main() {
    // Get raw API response for Аклашев (id=308028) and Petar Boychev (id=297231)
    const data = await FrotcomClient.calculateEcodriving('2026-03-01', '2026-03-27', [308028, 297231, 316256, 308008], undefined, 'driver');

    console.log('Raw API response for 4 mismatching drivers:');
    for (const r of data) {
        console.log(JSON.stringify(r, null, 2));
    }
}
main().catch(e => { console.error(e.message); process.exit(1); });
