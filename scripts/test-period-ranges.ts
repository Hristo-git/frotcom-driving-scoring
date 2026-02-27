import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function check(label: string, start: string, end: string) {
    const r = await FrotcomClient.calculateEcodriving(start, end);
    const cb = r.find((x: any) => x.licensePlate === 'CB1783ME') as any;
    console.log(`${label}: km=${cb?.mileageCanbus?.toFixed(1)}  score=${cb?.score}`);
}

async function main() {
    await check('Feb 22 only         ', '2026-02-22T00:00:00', '2026-02-22T23:59:59');
    await check('Feb 16-22 (7 days)  ', '2026-02-16T00:00:00', '2026-02-22T23:59:59');
    await check('Feb 09-22 (14 days) ', '2026-02-09T00:00:00', '2026-02-22T23:59:59');
    await check('Feb 01-22 (22 days) ', '2026-02-01T00:00:00', '2026-02-22T23:59:59');
    await check('Feb 14 only         ', '2026-02-14T00:00:00', '2026-02-14T23:59:59');
    await check('Jan 2025 (past year)', '2025-01-01T00:00:00', '2025-01-31T23:59:59');
}

main().catch(console.error);
