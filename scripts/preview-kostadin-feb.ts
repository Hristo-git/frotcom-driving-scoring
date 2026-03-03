
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function previewKostadinFeb() {
    const frotcomId = 297309; // Kostadin
    let totalMileage = 0;
    let totalScore = 0;
    let daysDriven = 0;
    let totalConsumption = 0;

    console.log("Fetching Kostadin's true daily data for February...");

    for (let day = 1; day <= 28; day++) {
        const dayStr = day.toString().padStart(2, '0');
        const start = `2026-02-${dayStr}T00:00:00`;
        const end = `2026-02-${dayStr}T23:59:59`;

        try {
            // Fetch entire fleet for the day
            const results = await FrotcomClient.calculateEcodriving(start, end, undefined, undefined, 'driver');
            const kwRecord = results.find((r: any) => r.driverId === frotcomId);

            if (kwRecord) {
                const mileage = kwRecord.mileageCanbus || kwRecord.mileageGps || 0;
                const score = parseFloat(kwRecord.score) || 0;
                const consumption = kwRecord.averageConsumption || 0;

                // Skip zero mileage days
                if (mileage > 0) {
                    console.log(`  Feb ${dayStr}: Score ${score.toFixed(2)}, Mileage ${mileage.toFixed(2)}km, Cons: ${consumption.toFixed(2)}l/100km`);
                    totalMileage += mileage;
                    totalScore += score;
                    totalConsumption += consumption;
                    daysDriven++;
                }
            }
        } catch (e: any) {
            console.error(`Error on Feb ${dayStr}: ${e.message}`);
        }
    }

    console.log("\n====== FEBRUARY SUMMARY FOR KOSTADIN ======");
    console.log(`Total Days Driven: ${daysDriven}`);
    console.log(`Total Mileage: ${totalMileage.toFixed(2)} km`);
    if (daysDriven > 0) {
        console.log(`Average Score (unweighted): ${(totalScore / daysDriven).toFixed(2)}`);
        console.log(`Average Consumption: ${(totalConsumption / daysDriven).toFixed(2)} l/100km`);
    }
}

previewKostadinFeb();
