
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkRawGeorgi() {
    const fid = 269157;
    const s = "2026-02-03T00:00:00";
    const e = "2026-02-03T23:59:59";

    try {
        console.log(`Checking Georgi (ID ${fid}) via API for ${s} to ${e}`);
        const apiRes = await FrotcomClient.calculateEcodriving(s, e, [fid], undefined, 'driver');
        const georgi = apiRes.find(r => r.driverId === fid);
        if (georgi) {
            console.log("Georgi API Data:", JSON.stringify(georgi, null, 2));
        } else {
            console.log("Georgi not found in API response for this day.");
        }
    } catch (err) {
        console.error(err);
    }
}
checkRawGeorgi();
