
import { fetchAndStoreEcodriving } from '../lib/ecodriving';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    const start = '2026-02-04T00:00:00';
    const end = '2026-02-10T23:59:59';

    console.log(`Starting manual fetch for missing period: ${start} - ${end}`);

    await fetchAndStoreEcodriving(start, end);

    console.log('Done.');
    process.exit(0);
}

run();
