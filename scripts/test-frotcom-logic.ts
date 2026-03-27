
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    const fId = 308028; // Kostadin
    const day1 = '2026-03-02';
    const day2 = '2026-03-03';
    const periodStart = '2026-03-02';
    const periodEnd = '2026-03-03';

    console.log(`Analyzing Frotcom scoring logic for 2-day period...`);

    const res1 = await FrotcomClient.calculateEcodriving(day1, day1, undefined, [fId], 'driver');
    const res2 = await FrotcomClient.calculateEcodriving(day2, day2, undefined, [fId], 'driver');
    const resPeriod = await FrotcomClient.calculateEcodriving(periodStart, periodEnd, undefined, [fId], 'driver');

    if (res1.length === 0 || res2.length === 0 || resPeriod.length === 0) {
        console.log("Missing data for one of the segments.");
        return;
    }

    const s1 = parseFloat(res1[0].score);
    const m1 = res1[0].mileageCanbus || res1[0].mileageGps || 0;
    
    const s2 = parseFloat(res2[0].score);
    const m2 = res2[0].mileageCanbus || res2[0].mileageGps || 0;

    const sP = parseFloat(resPeriod[0].score);
    const mP = resPeriod[0].mileageCanbus || resPeriod[0].mileageGps || 0;

    const weightedAvg = (s1 * m1 + s2 * m2) / (m1 + m2);

    console.log(`Day 1 (${day1}): Score ${s1}, Mileage ${m1}`);
    console.log(`Day 2 (${day2}): Score ${s2}, Mileage ${m2}`);
    console.log(`---`);
    console.log(`Frotcom Period Score:  ${sP.toFixed(4)} (Total Mileage: ${mP})`);
    console.log(`Calculated Weighted:  ${weightedAvg.toFixed(4)} (Total Mileage: ${m1 + m2})`);
    console.log(`Difference:           ${Math.abs(sP - weightedAvg).toFixed(4)}`);
}

main().catch(console.error);
