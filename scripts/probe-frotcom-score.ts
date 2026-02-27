
import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const BASE = 'https://v2api.frotcom.com';

async function getAccessToken() {
    const username = process.env.FROTCOM_USER;
    const password = process.env.FROTCOM_PASS;
    const url = `${BASE}/v2/authorize`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, provider: 'thirdparty' })
    });
    const data = await resp.json();
    return data.token || data.api_key;
}

async function run() {
    const token = await getAccessToken();
    const driverFId = '336635'; // Yordan Angelov
    const date = '2026-02-25';

    console.log(`Fetching Frotcom score for ${driverFId} on ${date}`);
    const url = `${BASE}/v2/ecodriving/scores/daily?df=${date}&dt=${date}&api_key=${token}&version=1`;
    const resp = await fetch(url);
    const data = await resp.json();

    const driverScore = data.find(s => s.driverId == driverFId);
    if (driverScore) {
        console.log('Score found in Frotcom API:');
        console.log(JSON.stringify(driverScore, null, 2));
    } else {
        console.log('Score NOT found in Frotcom API for this driver/date.');
    }

    await pool.end();
}

run().catch(console.error);
