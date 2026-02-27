import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function searchAdjacentDays() {
    try {
        console.log(`Searching Feb 13, 14, 15 for Zhivko's 463km...`);

        const dates = [
            { name: 'Feb 13', start: '2026-02-13T00:00:00', end: '2026-02-13T23:59:59' },
            { name: 'Feb 14', start: '2026-02-14T00:00:00', end: '2026-02-14T23:59:59' },
            { name: 'Feb 15', start: '2026-02-15T00:00:00', end: '2026-02-15T23:59:59' },
            { name: 'Jan 1', start: '2026-01-01T00:00:00', end: '2026-01-01T23:59:59' },
            { name: 'Jan 2', start: '2026-01-02T00:00:00', end: '2026-01-02T23:59:59' }
        ];

        for (const date of dates) {
            console.log(`\n\n--- Fetching ${date.name} ---`);
            let data = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
                from_datetime: date.start,
                to_datetime: date.end
            });

            if (data && data.length > 0) {
                const zhivkoRecs = data.filter(d =>
                    d.driverId === 308019 ||
                    (d.driversId && d.driversId.includes(308019)) ||
                    (d.driverName && d.driverName.includes('Живко')) ||
                    (d.drivers && d.drivers.some((n: string) => n.includes('Живко')))
                );

                if (zhivkoRecs.length > 0) {
                    let sum = 0;
                    console.log(`Found ${zhivkoRecs.length} records for Zhivko:`);
                    zhivkoRecs.forEach(r => {
                        console.log(`  - Vehicle: ${r.licensePlate}, Mileage: ${r.mileage}`);
                        sum += (r.mileage || 0);
                    });
                    console.log(`  => TOTAL FOR ZHIVKO: ${sum} km`);
                } else {
                    console.log(`  Zhivko not found in this day's records.`);
                }
            } else {
                console.log(`  No records returned!`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

searchAdjacentDays();
