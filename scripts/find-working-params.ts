
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function findWorkingParams() {
    try {
        console.log('Testing v2/ecodriving/calculate with various parameters...');

        const date1 = '2026-02-14';
        const date2 = '2026-02-28';

        const tests = [
            { desc: 'URL: from_datetime/to_datetime (local)', url: (s: string, e: string) => `v2/ecodriving/calculate?from_datetime=${encodeURIComponent(s)}&to_datetime=${encodeURIComponent(e)}`, body: {} },
            { desc: 'URL: df/dt (UTC)', url: (s: string, e: string) => `v2/ecodriving/calculate?df=${encodeURIComponent(s)}&dt=${encodeURIComponent(e)}`, body: {} },
            { desc: 'Body: from_datetime/to_datetime (local)', url: () => 'v2/ecodriving/calculate', body: (s: string, e: string) => ({ from_datetime: s, to_datetime: e }) },
            { desc: 'Body: df/dt (UTC)', url: () => 'v2/ecodriving/calculate', body: (s: string, e: string) => ({ df: s, dt: e }) }
        ];

        for (const test of tests) {
            console.log(`\n--- ${test.desc} ---`);

            const results = [];
            for (const d of [date1, date2]) {
                const s = `${d}T00:00:00`;
                const e = `${d}T23:59:59`;
                const urlStr = test.url(s, e);
                const bodyObj = typeof test.body === 'function' ? test.body(s, e) : test.body;

                const data = await FrotcomClient.request<any[]>(urlStr, 'POST', bodyObj);
                const sum = data.reduce((acc, r) => acc + (r.mileage || 0), 0);
                results.push(sum);
                console.log(`  [${d}] Fleet Mileage: ${sum.toFixed(2)} km (${data.length} records)`);
            }

            if (results[0] !== results[1]) {
                console.log('  ✅ SUCCESS! This parameter combination resulted in different data for different days.');
            } else {
                console.log('  ❌ FAILED. Same data returned for both days.');
            }
        }

    } catch (err: any) {
        console.error('API Error:', err.message);
    }
}

findWorkingParams();
