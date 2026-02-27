import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyNoGroup() {
    try {
        console.log(`Checking Feb 14 for Zhivko (ID: 308019) with NO groupBy...`);

        const start = '2026-02-14T00:00:00';
        const end = '2026-02-14T23:59:59';

        const data = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: start,
            to_datetime: end,
            driverIds: [308019]
            // NO GROUP BY
        });

        console.dir(data, { depth: null });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

verifyNoGroup();
