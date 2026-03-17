
import { FrotcomClient } from '../lib/frotcom';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    const res = await FrotcomClient.calculateEcodriving('2026-03-15T00:00:00', '2026-03-15T23:59:59', undefined, undefined, 'vehicle');
    const multi = res.filter(r => Array.isArray(r.driversId) && r.driversId.length > 1);
    console.log(`Found ${multi.length} multi-driver vehicles`);
    console.log(JSON.stringify(multi[0], null, 2));

    const driverZero = res.filter(r => (Array.isArray(r.driversId) && r.driversId.includes(0)) || r.driverId === 0);
    console.log(`Found ${driverZero.length} unknown driver vehicles`);
    console.log(JSON.stringify(driverZero[0], null, 2));
}

main().catch(console.error);
