
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// CB1783ME vehicleId from the ecodriving record = 320225
const VEHICLE_ID = 320225;
const DATE = '2026-02-14';

async function checkVehicleTrips() {
    // Try vehicle-specific endpoints
    console.log(`=== Vehicle trips for CB1783ME (id=${VEHICLE_ID}) on ${DATE} ===`);

    // v2/trips endpoint
    try {
        const result = await FrotcomClient.request<any>('v2/trips', 'POST', {
            from_datetime: `${DATE}T00:00:00`,
            to_datetime: `${DATE}T23:59:59`,
            vehicleIds: [VEHICLE_ID],
        });
        console.log('v2/trips:', JSON.stringify(result, null, 2).slice(0, 1500));
    } catch (e: any) { console.log('v2/trips error:', e.message); }

    // v2/vehicles/{id}/trips
    try {
        const result = await FrotcomClient.request<any>(`v2/vehicles/${VEHICLE_ID}/trips`, 'POST', {
            from_datetime: `${DATE}T00:00:00`,
            to_datetime: `${DATE}T23:59:59`,
        });
        console.log(`v2/vehicles/${VEHICLE_ID}/trips:`, JSON.stringify(result, null, 2).slice(0, 1500));
    } catch (e: any) { console.log(`v2/vehicles/${VEHICLE_ID}/trips error:`, e.message); }

    // v2/activities endpoint
    try {
        const result = await FrotcomClient.request<any>('v2/activities', 'POST', {
            from_datetime: `${DATE}T00:00:00`,
            to_datetime: `${DATE}T23:59:59`,
            vehicleIds: [VEHICLE_ID],
        });
        console.log('v2/activities:', JSON.stringify(result, null, 2).slice(0, 1500));
    } catch (e: any) { console.log('v2/activities error:', e.message); }

    // The key question: does driverId=0 in the API mean "unidentified driver"?
    // Or is the record structure different? Let me fetch all records WITHOUT filtering
    // and find all records where 308019 appears in driversId
    console.log('\n=== All ecodriving records where 308019 appears in driversId ===');
    try {
        const result = await FrotcomClient.calculateEcodriving(
            `${DATE}T00:00:00`,
            `${DATE}T23:59:59`,
        );
        const relevantRecords = result.filter((r: any) =>
            r.driversId && r.driversId.includes(308019)
        );
        console.log(`Found ${relevantRecords.length} records with Живко (308019):`);
        relevantRecords.forEach((r: any) => {
            const total = r.mileageCanbus > 0 ? r.mileageCanbus : r.mileageGps;
            console.log(`  ${r.licensePlate}: canbus=${r.mileageCanbus}, gps=${r.mileageGps}, drivers=${JSON.stringify(r.driversId)}, time=${r.drivingTime}s`);
            console.log(`    score=${r.score}, idleTimePerc=${r.idleTimePerc}%`);
        });

        // Check total mileage sum for all records where he appears
        const totalMileage = relevantRecords.reduce((s: number, r: any) => {
            return s + (r.mileageCanbus > 0 ? r.mileageCanbus : (r.mileageGps || 0));
        }, 0);
        console.log(`\nTotal across all vehicles: ${totalMileage.toFixed(1)} km`);
        console.log(`Frotcom UI shows: 463.6 km`);
    } catch (e: any) { console.log('Error:', e.message); }
}

checkVehicleTrips().catch(console.error);
