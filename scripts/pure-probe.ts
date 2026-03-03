
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function pureProbe() {
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

    const date = '2026-02-25';
    // Test multiple paths
    const paths = [
        `v2/ecodriving/scores/daily?df=${date}&dt=${date}`,
        `v2/ecodriving/daily?df=${date}&dt=${date}`,
        `v2/ecodriving/scores?from_datetime=${date}T00:00:00Z&to_datetime=${date}T23:59:59Z`,
        `v2/ecodriving/calculate?from_datetime=${date}T00:00:00Z&to_datetime=${date}T23:59:59Z`
    ];

    for (const p of paths) {
        const url = `https://v2api.frotcom.com/${p}&api_key=${token}&version=1`;
        console.log(`\nProbing: ${url}`);
        const resp = await fetch(url);
        console.log(`Status: ${resp.status}`);
        if (resp.ok) {
            const data: any = await resp.json();
            console.log(`Success! Data length: ${Array.isArray(data) ? data.length : 'Object'}`);
            if (Array.isArray(data) && data.length > 0) {
                console.log('Sample:', JSON.stringify(data[0]).slice(0, 200));
            }
        }
    }
}

pureProbe();
