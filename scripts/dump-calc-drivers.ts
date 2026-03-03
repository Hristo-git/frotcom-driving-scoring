
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function dumpDrivers() {
    const start = '2026-02-25T00:00:00';
    const end = '2026-02-25T23:59:59';
    try {
        const results = await FrotcomClient.calculateEcodriving(start, end);
        console.log(`Received ${results.length} records.`);
        for (const r of results) {
            console.log(`Driver ID: ${r.driverId}, Name: ${r.driverName}, Auth Vehicle: ${r.vehicles && r.vehicles.length > 0 ? r.vehicles[0] : 'None'}`);
        }
    } catch (e: any) {
        console.error(e.message);
    }
}
dumpDrivers();
