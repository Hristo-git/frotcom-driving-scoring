/**
 * Inspect the FULL raw structure of a single ecodriving record
 * to see every field the Frotcom API returns.
 */
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const VID = 320225; // CB1783ME

async function run() {
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Sofia' }).format(new Date());
    const start = `${today}T00:00:00+02:00`;
    const end = `${today}T23:59:59+02:00`;

    console.log(`Fetching ALL fields from ecodriving/calculate for today (${today})...\n`);

    const results = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
        from_datetime: start,
        to_datetime: end,
        vehicleIds: [VID]
    });

    if (!results || results.length === 0) {
        console.log('No results returned.');
        return;
    }

    // Print the first record with ALL fields
    const record = results[0];
    console.log('=== ALL FIELDS IN A SINGLE ECODRIVING RECORD ===');
    console.log(JSON.stringify(record, null, 2));

    console.log('\n=== FIELD LIST ===');
    Object.entries(record).forEach(([key, val]) => {
        const type = typeof val;
        const display = type === 'object' ? JSON.stringify(val) : val;
        console.log(`  ${key.padEnd(30)} [${type}]  = ${String(display).slice(0, 80)}`);
    });
}

run().catch(console.error);
