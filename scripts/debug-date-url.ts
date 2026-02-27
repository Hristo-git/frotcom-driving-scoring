import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkQueryStringDates() {
    try {
        console.log(`Checking if URL Query String dates actually fetch historical data...`);

        const dates = [
            { name: 'Feb 14', start: '2026-02-14T00:00:00', end: '2026-02-14T23:59:59' },
            { name: 'Feb 13', start: '2026-02-13T00:00:00', end: '2026-02-13T23:59:59' },
            { name: 'Jan  1', start: '2026-01-01T00:00:00', end: '2026-01-01T23:59:59' }
        ];

        for (const date of dates) {
            console.log(`\nFetching ${date.name} exactly via query string without driver filter...`);

            // Do NOT put dates in the body, only in the URL. No driver IDs first to see all.
            const url = `v2/ecodriving/calculate?from_datetime=${encodeURIComponent(date.start)}&to_datetime=${encodeURIComponent(date.end)}`;

            let data = await FrotcomClient.request<any[]>(url, 'POST', {});

            if (data && data.length > 0) {
                // Sum the mileage of all vehicles for this day to prove the date filter works
                let sum = data.reduce((acc, d) => acc + (d.mileage || 0), 0);
                console.log(`Total Fleet Mileage for ${date.name}: ${sum} km (from ${data.length} records)`);

                // Look for Zhivko explicitly
                let zhivkos = data.filter(d =>
                    d.licensePlate === 'CB1783ME' ||
                    (d.drivers && d.drivers.some((n: string) => n.includes('Живко')))
                );
                console.log(`Zhivko/CB1783ME records found: ${zhivkos.length}`);

                let zhivkoSum = zhivkos.reduce((acc, d) => acc + (d.mileage || 0), 0);
                console.log(`Zhivko/CB1783ME Combined mileage: ${zhivkoSum} km`);
            } else {
                console.log('No data returned!');
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkQueryStringDates();
