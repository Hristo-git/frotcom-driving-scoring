
import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function fixKostadinQuick() {
    const frotcomId = 297309;
    const startStr = `2026-02-25T00:00:00`;
    const endStr = `2026-02-25T23:59:59`;

    console.log(`Fetching ${startStr}...`);
    // Pass EMPTY array or undefined for driverIds
    const results = await FrotcomClient.calculateEcodriving(startStr, endStr, undefined, undefined, 'driver');

    if (results && results.length > 0) {
        const record = results.find(r => r.driverId === frotcomId);
        if (!record) {
            console.log(`Kostadin not found in ${results.length} records.`);
        } else {
            console.log(`Found Kostadin! Score: ${record.score}, Mileage: ${record.mileageCanbus || record.mileageGps}`);
        }
    }
}
fixKostadinQuick();
