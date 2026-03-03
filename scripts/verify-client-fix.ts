
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyClientFix() {
    const dId = 308028; // Костадин Ангелов Аклашев
    const date = '2026-03-02';
    const s = `${date}T00:00:00`;
    const e = `${date}T23:59:59`;

    try {
        console.log(`--- Verifying FrotcomClient Fix for ${dId} on ${date} ---`);
        const res = await FrotcomClient.calculateEcodriving(s, e, [dId], undefined, 'driver');

        const item = res.find(r => r.driverId === dId);
        if (item) {
            console.log(`  SUCCESS! Mileage: ${item.mileage}km, Score: ${item.score}`);
        } else {
            console.log("  FAILED: Result not found in fixed client response.");
        }
    } catch (err) {
        console.error("  FAILED with error:", err);
    }
}
verifyClientFix();
