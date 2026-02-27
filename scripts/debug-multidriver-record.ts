
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkRecord() {
    const results = await FrotcomClient.calculateEcodriving('2026-02-14T00:00:00', '2026-02-14T23:59:59');
    const rec = results.find((r: any) => r.licensePlate === 'CB9061CK');
    if (rec) {
        console.log('CB9061CK full record:');
        console.log(JSON.stringify(rec, null, 2));
        console.log('\nAll keys:', Object.keys(rec));
    } else {
        console.log('CB9061CK not found');
    }
}

checkRecord().catch(console.error);
