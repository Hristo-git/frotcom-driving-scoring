import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugDateQueryString() {
    console.log(`Testing dates in query string for Frotcom API...`);
    try {
        const start = '2026-02-14T00:00:00';
        const end = '2026-02-14T23:59:59';
        const driverId = 308019; // Zhivko

        // Use request directly to append to query string
        const body = {
            driverIds: [driverId],
            groupBy: 'driver'
        };

        console.log(`Requesting driver ${driverId} for ${start} to ${end} with dates in URL...`);
        const result = await FrotcomClient.request<any[]>(`v2/ecodriving/calculate?from_datetime=${encodeURIComponent(start)}&to_datetime=${encodeURIComponent(end)}`, 'POST', body);

        if (result && result.length > 0) {
            console.log(`-> Returned Mileage: ${result[0].mileage} km`);
            console.dir(result[0], { depth: null });
        } else {
            console.log('-> No data returned');
        }

        // Test with Unix timestamps in query string
        console.log(`\nRequesting driver ${driverId} for Unix timestamps in URL...`);
        const startTs = Math.floor(new Date('2026-02-14T00:00:00Z').getTime() / 1000);
        const endTs = Math.floor(new Date('2026-02-14T23:59:59Z').getTime() / 1000);
        const resultUnix = await FrotcomClient.request<any[]>(`v2/ecodriving/calculate?from_datetime=${startTs}&to_datetime=${endTs}`, 'POST', body);

        if (resultUnix && resultUnix.length > 0) {
            console.log(`-> Returned Mileage (Unix): ${resultUnix[0].mileage} km`);
        } else {
            console.log('-> No data returned');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debugDateQueryString();
