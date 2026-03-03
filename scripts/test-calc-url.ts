
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testCalculateURL() {
    const start = '2026-02-15T00:00:00';
    const end = '2026-02-15T23:59:59';

    // Test 1: driverIds[] in URL
    const url1 = `v2/ecodriving/calculate?from_datetime=${start}&to_datetime=${end}&groupBy=driver&driverIds=${encodeURIComponent('[297309]')}`;
    console.log(`\nTesting URL 1: ${url1}`);
    try {
        const res1 = await FrotcomClient.request<any[]>(url1, 'POST', {});
        console.log(`Results length: ${res1.length}`);
        if (res1.length === 1) console.log(res1[0].driverId, res1[0].score);
    } catch (e) { }

    // Test 2: driverIds in URL without brackets
    const url2 = `v2/ecodriving/calculate?from_datetime=${start}&to_datetime=${end}&groupBy=driver&driverIds=297309`;
    console.log(`\nTesting URL 2: ${url2}`);
    try {
        const res2 = await FrotcomClient.request<any[]>(url2, 'POST', {});
        console.log(`Results length: ${res2.length}`);
        if (res2.length === 1) console.log(res2[0].driverId, res2[0].score);
    } catch (e) { }

    // Test 3: driverId in URL
    const url3 = `v2/ecodriving/calculate?from_datetime=${start}&to_datetime=${end}&groupBy=driver&driverId=297309`;
    console.log(`\nTesting URL 3: ${url3}`);
    try {
        const res3 = await FrotcomClient.request<any[]>(url3, 'POST', {});
        console.log(`Results length: ${res3.length}`);
        if (res3.length === 1) console.log(res3[0].driverId, res3[0].score);
    } catch (e) { }
}
testCalculateURL();
