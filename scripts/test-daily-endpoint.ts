
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testDailyScores() {
    const frotcomId = 297309; // Kostadin

    try {
        const token = await FrotcomClient.getAccessToken();
        const date = '2026-02-25'; // A Wednesday

        console.log(`Testing GET v2/ecodriving/scores/daily for ${date}...`);

        const url = `v2/ecodriving/scores/daily?df=${date}&dt=${date}`;
        const data = await FrotcomClient.request<any[]>(url, 'GET');

        const driverScore = data.find(s => s.driverId == frotcomId);
        if (driverScore) {
            console.log('Score found in Frotcom:');
            console.dir(driverScore, { depth: null });
        } else {
            console.log('Score NOT found for Kostadin on this day.');
            console.log(`Received ${data.length} records. Sample driverId: ${data[0]?.driverId}`);
        }

    } catch (err: any) {
        console.error('API Error:', err.message);
    }
}

testDailyScores();
