
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function bruteDriver() {
    const user = process.env.FROTCOM_USER;
    const pass = process.env.FROTCOM_PASS;

    // Auth
    const authResp = await fetch('https://v2api.frotcom.com/v2/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass, provider: 'thirdparty' })
    });
    const authData: any = await authResp.json();
    const token = authData.token || authData.api_key;

    const dId = 297309; // Kostadin
    const date = '2026-02-25';
    const endpoints = [
        `v2/drivers/${dId}/ecodriving/scores`,
        `v2/drivers/${dId}/ecodriving/daily`,
        `v2/drivers/${dId}/scores`,
        `v2/drivers/${dId}/eco-scores`,
        `v2/drivers/${dId}/performance`,
        `v2/ecodriving/scores/driver/${dId}`,
        `v2/ecodriving/scores/daily/${dId}`
    ];

    for (const p of endpoints) {
        const url = `https://v2api.frotcom.com/${p}?df=${date}&dt=${date}&from_datetime=${date}T00:00:00Z&to_datetime=${date}T23:59:59Z&api_key=${token}&version=1`;
        console.log(`\nProbing: ${url}`);
        const resp = await fetch(url);
        console.log(`Status: ${resp.status}`);
        if (resp.ok) {
            console.log(`  ✅ FOUND!`);
            const data: any = await resp.json();
            console.log(JSON.stringify(data).slice(0, 500));
        }
    }
}

bruteDriver();
