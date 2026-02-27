
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugMileageFields() {
    const start = '2026-02-14T00:00:00';
    const end = '2026-02-14T23:59:59';

    // Drivers from the Frotcom report to compare
    // Zhivko Nankov - СВ6234РЕ  → CANBus:247, GPS:244
    const ZHIVKO_ID = 298988;
    // СВ6233РE (no driver assigned in report) → CANbus:0, GPS:575  – vehicle-only test
    // CB1785ME Костадин Василев → CANbus:0, GPS:122
    const KOSTADIN_STOLNIK_ID = 297000; // unknown, will search by name
    // СВ9662ЕО Georgi Yankov → CANbus:687, GPS:676
    const GEORGI_YANKOV_ID = 309700; // unknown, will search

    try {
        console.log(`Fetching raw API data for ${start} → ${end}...\n`);
        const results = await FrotcomClient.calculateEcodriving(start, end);
        console.log(`Total records from API: ${results.length}\n`);

        // Print ALL distinct mileage-related field names from first record
        if (results.length > 0) {
            const first = results[0];
            const mileageKeys = Object.keys(first).filter(k =>
                k.toLowerCase().includes('mileage') ||
                k.toLowerCase().includes('km') ||
                k.toLowerCase().includes('distance') ||
                k.toLowerCase().includes('travel')
            );
            console.log('=== Mileage-related fields in raw record ===');
            console.log(mileageKeys);
            console.log('\nFull first record sample:');
            console.log(JSON.stringify(first, null, 2));
        }

        console.log('\n=== Records for Zhivko Nankov (ID: 298988) ===');
        console.log('Report shows: CANBus=247, GPS=244\n');
        const zhivkoRecords = results.filter((r: any) => r.driversId && r.driversId.includes(ZHIVKO_ID));
        console.log(`Found ${zhivkoRecords.length} API records for Zhivko:`);
        zhivkoRecords.forEach((r: any, i: number) => {
            console.log(`\nRecord ${i + 1}:`);
            console.log(`  mileage:      ${r.mileage}`);
            console.log(`  mileageGps:   ${r.mileageGps}`);
            console.log(`  mileageCanbus:${r.mileageCanbus}`);
            console.log(`  drivingTime:  ${r.drivingTime}`);
            console.log(`  score:        ${r.score}`);
            console.log(`  licensePlate: ${r.licensePlate}`);
        });

        // Sum what our code would produce
        let totalMileage = 0, totalGps = 0, totalCanbus = 0;
        zhivkoRecords.forEach((r: any) => {
            totalMileage += r.mileage || 0;
            totalGps += r.mileageGps || 0;
            totalCanbus += r.mileageCanbus || 0;
        });
        console.log(`\n>>> Our aggregated mileage for Zhivko: ${totalMileage}`);
        console.log(`>>> Our aggregated mileageGps:         ${totalGps}`);
        console.log(`>>> Our aggregated mileageCanbus:      ${totalCanbus}`);
        console.log(`>>> Report expected: CANBus=247, GPS=244`);

        // Show some records where mileageCanbus=0 but GPS>0 to understand
        console.log('\n=== Records where mileageCanbus=0 but mileageGps>0 ===');
        const gpsOnlyRecs = results.filter((r: any) =>
            (r.mileageCanbus === 0 || r.mileageCanbus === null) && r.mileageGps > 0
        );
        console.log(`Count: ${gpsOnlyRecs.length}`);
        gpsOnlyRecs.slice(0, 3).forEach((r: any, i: number) => {
            console.log(`\nGPS-only record ${i + 1}:`);
            console.log(`  licensePlate: ${r.licensePlate}`);
            console.log(`  drivers:      ${JSON.stringify(r.drivers)}`);
            console.log(`  mileage:      ${r.mileage}`);
            console.log(`  mileageGps:   ${r.mileageGps}`);
            console.log(`  mileageCanbus:${r.mileageCanbus}`);
        });

        // Fleet total comparison
        let fleetMileage = 0, fleetGps = 0, fleetCanbus = 0;
        results.forEach((r: any) => {
            fleetMileage += r.mileage || 0;
            fleetGps += r.mileageGps || 0;
            fleetCanbus += r.mileageCanbus || 0;
        });
        console.log('\n=== FLEET TOTALS for Feb 14 ===');
        console.log(`Total mileage (API 'mileage' field): ${fleetMileage.toFixed(0)} km`);
        console.log(`Total mileageGps:                    ${fleetGps.toFixed(0)} km`);
        console.log(`Total mileageCanbus:                 ${fleetCanbus.toFixed(0)} km`);

    } catch (e) {
        console.error(e);
    }
}

debugMileageFields();
