
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function purePostProbe() {
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

    const d = '2026-02-14';
    const variations = [
        { desc: 'T format + offset', body: { from_datetime: `${d}T00:00:00+02:00`, to_datetime: `${d}T23:59:59+02:00` } },
        { desc: 'No T, no offset', body: { from_datetime: `${d} 00:00:00`, to_datetime: `${d} 23:59:59` } },
        { desc: 'UTC Z format', body: { from_datetime: `${d}T00:00:00Z`, to_datetime: `${d}T23:59:59Z` } },
        { desc: 'with groupBy: driver', body: { from_datetime: `${d} 00:00:00`, to_datetime: `${d} 23:59:59`, groupBy: 'driver' } }
    ];

    for (const v of variations) {
        console.log(`\n--- Testing ${v.desc} ---`);
        const url = `https://v2api.frotcom.com/v2/ecodriving/calculate?api_key=${token}&version=1`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(v.body)
        });

        if (resp.ok) {
            const data: any[] = await resp.json();
            const sum = data.reduce((s, r) => s + (r.mileage || 0), 0);
            console.log(`  Records: ${data.length}, Fleet Mileage: ${sum.toFixed(1)} km`);
        } else {
            console.log(`  Failed: ${resp.status}`);
        }
    }
}

purePostProbe();
