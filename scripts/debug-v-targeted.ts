
import { FrotcomClient, toFrotcomLocal } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugV() {
    const vId = 340660; // CB6285CE
    const date = '2026-02-01';
    const s = `${date}T00:00:00`;
    const e = `${date}T23:59:59`;

    try {
        console.log(`Checking vehicle ${vId} distance for ${date}...`);
        const resV = await FrotcomClient.calculateEcodriving(s, e, undefined, [vId], 'vehicle');
        console.log("Vehicle calculate result:");
        console.log(JSON.stringify(resV, null, 2));
    } catch (err) {
        console.error(err);
    }
}
debugV();
