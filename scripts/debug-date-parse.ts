import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyDates() {
    try {
        console.log(`Checking completely different dates for Zhivko to see if Frotcom ignores them...`);

        const spans = [
            { name: 'Jan 1', start: '2026-01-01T00:00:00', end: '2026-01-01T23:59:59' },
            { name: 'Jan 5', start: '2026-01-05T00:00:00', end: '2026-01-05T23:59:59' },
            { name: 'Feb 14', start: '2026-02-14T00:00:00', end: '2026-02-14T23:59:59' }
        ];

        for (const span of spans) {
            console.log(`\nTesting ${span.name} (${span.start} to ${span.end}):`);
            const data = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
                from_datetime: span.start,
                to_datetime: span.end,
                driverIds: [308019],
                groupBy: 'driver'
            });

            if (data && data.length > 0) {
                console.log(`-> Distance: ${data[0].mileage} km`);
            } else {
                console.log('-> No data returned');
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

verifyDates();
