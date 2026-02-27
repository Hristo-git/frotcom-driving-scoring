
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugDriverRaw() {
    const driverId = 332931; // "Горан Димишковска - Скопие"
    // Replicate logic from refetch-daily.ts
    const d = new Date('2026-02-07');
    const dateStr = d.toISOString().split('T')[0];
    const start1 = `${dateStr}T00:00:00`;
    const end1 = `${dateStr}T23:59:59`;

    console.log(`Generated Date Strings: ${start1} to ${end1}`);

    // Period 2 (Feb 8)
    const start2 = '2026-02-08T00:00:00';
    const end2 = '2026-02-08T23:59:59';

    try {
        console.log(`Fetching BULK for ${start1} (driverIds: undefined)...`);
        // @ts-ignore
        const res1 = await FrotcomClient.calculateEcodriving(start1, end1, undefined);
        console.log(`Result 1 Count: ${res1.length}`);

        const matches1 = res1.filter((r: any) => r.driversId && r.driversId.includes(driverId));
        console.log(`Found ${matches1.length} matches for Driver 1 (Zhivko).`);
        matches1.forEach((m: any, i: number) => {
            console.log(`Match 1-${i}:`, JSON.stringify(m, null, 2));
        });

    } catch (e) {
        console.error(e);
    }
}

debugDriverRaw();
