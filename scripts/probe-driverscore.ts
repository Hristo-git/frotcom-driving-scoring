
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkDriverScore() {
    const startIso = '2026-02-01T00:00:00Z';
    const endIso = '2026-02-28T23:59:59Z';

    try {
        const token = await FrotcomClient.getAccessToken();
        const qs = new URLSearchParams({
            initial_datetime: startIso,
            final_datetime: endIso,
            api_key: token,
            version: '1'
        });

        console.log(`Trying GET /v2/driverscore`);
        // Maybe it has GET or POST? Let's try GET
        const res = await fetch(`https://v2api.frotcom.com/v2/driverscore?${qs}`);
        console.log(`Status: ${res.status}`);
        if (res.ok) {
            console.log("Success! Data:");
            console.log(await res.text());
        } else {
            console.log(await res.text());
        }
    } catch (e: any) {
        console.error(e.message);
    }
}
checkDriverScore();
