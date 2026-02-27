
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function analyzeMultiDriverRecords() {
    console.log('Fetching Feb 14...');
    const results = await FrotcomClient.calculateEcodriving('2026-02-14T00:00:00', '2026-02-14T23:59:59');

    let apiTotal = 0;
    let multiDriverMileage = 0;
    let singleDriverMileage = 0;
    let noDriverMileage = 0;

    const multiDriverRecords: any[] = [];

    for (const r of results) {
        const km = (r.mileageCanbus && r.mileageCanbus > 0) ? r.mileageCanbus : (r.mileageGps || 0);
        apiTotal += km;

        const realDrivers = (r.driversId || []).filter((id: number) => id !== 0);

        if (realDrivers.length === 0) {
            noDriverMileage += km;
        } else if (realDrivers.length === 1) {
            singleDriverMileage += km;
        } else {
            // Multiple real drivers on same vehicle trip!
            multiDriverMileage += km;
            multiDriverRecords.push({
                plate: r.licensePlate,
                driversId: r.driversId,
                km: km.toFixed(1),
                drivingTime: r.drivingTime
            });
        }
    }

    console.log('\n=== API Fleet Total for Feb 14 ===');
    console.log('Total mileage:', apiTotal.toFixed(0), 'km', '(this should equal DB if no double-counting)');
    console.log('Single-driver vehicle km:', singleDriverMileage.toFixed(0));
    console.log('Multi-driver vehicle km (counted ONCE per vehicle):', multiDriverMileage.toFixed(0));
    console.log('  - these km get counted N times in DB (once per driver)!');
    console.log('  - DB over-counts by approximately:', (multiDriverMileage * (multiDriverRecords.reduce((acc, r) => acc + r.driversId.filter((id: number) => id !== 0).length - 1, 0) / multiDriverRecords.length)).toFixed(0), 'km');
    console.log('No-driver vehicle km (not stored):', noDriverMileage.toFixed(0));
    console.log('\n=== Multi-driver vehicle records (these cause double-counting) ===');
    multiDriverRecords.slice(0, 20).forEach(r => {
        console.log(`  ${r.plate}: driversId=${JSON.stringify(r.driversId)}, km=${r.km}`);
    });
    console.log(`\nTotal multi-driver records: ${multiDriverRecords.length}`);

    // Calculate expected DB total (single + multi counted once per driver)
    let expectedDbTotal = singleDriverMileage;
    for (const r of results) {
        const km = (r.mileageCanbus && r.mileageCanbus > 0) ? r.mileageCanbus : (r.mileageGps || 0);
        const realDrivers = (r.driversId || []).filter((id: number) => id !== 0);
        if (realDrivers.length > 1) {
            expectedDbTotal += km * realDrivers.length; // each driver gets full km
        }
    }
    console.log('\nExpected DB total (with double-counting for multi-driver records):', expectedDbTotal.toFixed(0), 'km');
    console.log('Actual DB total:', '21647', 'km');
}

analyzeMultiDriverRecords().catch(console.error);
