
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    const startDate = '2026-03-01';
    const endDate = '2026-03-07';
    const driverId = 32801; // Kostadin's ID from previous run (need to verify)
    
    // First, let's find the driver ID properly
    const drivers = await FrotcomClient.getDrivers();
    const kostadin = drivers.find(d => d.name.includes('Костадин Ангелов Аклашев'));
    if (!kostadin) {
        console.error("Driver not found in Frotcom");
        return;
    }
    const fId = kostadin.driverId;
    console.log(`Analyzing Frotcom API for ${kostadin.name} (ID: ${fId})`);

    // 1. Periodic call
    console.log("\n--- PERIODIC CALL (Mar 1 - Mar 7) ---");
    const periodResults = await FrotcomClient.calculateEcodriving(startDate, endDate, undefined, [fId], 'driver');
    console.log(JSON.stringify(periodResults, null, 2));

    // 2. Daily calls
    console.log("\n--- DAILY CALLS ---");
    const days = [
        '2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07'
    ];
    
    let weightedSum = 0;
    let totalDist = 0;

    for (const day of days) {
        const dayRes = await FrotcomClient.calculateEcodriving(day, day, undefined, [fId], 'driver');
        if (dayRes.length > 0) {
            const r = dayRes[0];
            const s = parseFloat(r.score);
            const m = r.mileageCanbus || r.mileageGps || 0;
            console.log(`${day}: Score ${s}, Mileage ${m.toFixed(2)} km`);
            weightedSum += s * m;
            totalDist += m;
        } else {
            console.log(`${day}: No data`);
        }
    }

    if (totalDist > 0) {
        console.log(`\nWeighted Average from Daily: ${(weightedSum / totalDist).toFixed(4)} (Total Distance: ${totalDist.toFixed(2)} km)`);
    }
}

main().catch(console.error);
