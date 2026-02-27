
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const VEHICLE_ID = 320225; // CB1783ME
const DATE = '2026-02-14';

async function checkVehicleDetails() {
    // GET vehicle details - might have current odometer
    console.log('=== GET v2/vehicles/320225 ===');
    try {
        const result = await FrotcomClient.request<any>(`v2/vehicles/${VEHICLE_ID}`);
        console.log(JSON.stringify(result, null, 2));
    } catch (e: any) { console.log('Error:', e.message); }

    // Try GET trips for vehicle (different HTTP method)
    console.log('\n=== GET v2/vehicles/320225/trips ===');
    try {
        const result = await FrotcomClient.request<any>(`v2/vehicles/${VEHICLE_ID}/trips`);
        console.log('Trips count:', Array.isArray(result) ? result.length : 'N/A');
        if (Array.isArray(result)) {
            const feb14 = result.filter((t: any) => {
                const d = t.startTime || t.start || t.date || '';
                return d.startsWith(DATE);
            });
            console.log('Feb 14 trips:', feb14.length);
            console.log(JSON.stringify(feb14.slice(0, 3), null, 2));
        } else {
            console.log(JSON.stringify(result, null, 2).slice(0, 1000));
        }
    } catch (e: any) { console.log('Error:', e.message); }

    // Try calculateEcodriving with groupByDriver=true parameter
    console.log('\n=== calculateEcodriving with groupByDriver options ===');
    try {
        const result = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: `${DATE}T00:00:00`,
            to_datetime: `${DATE}T23:59:59`,
            groupByDriver: true,
        });
        if (Array.isArray(result)) {
            const zhivko = result.find((r: any) =>
                r.driversId?.includes(308019) || r.driverId === 308019 ||
                (r.drivers && JSON.stringify(r.drivers).includes('Живко'))
            );
            console.log('Живко record:', JSON.stringify(zhivko, null, 2));
            console.log('Total records:', result.length);
            console.log('First record keys:', Object.keys(result[0] || {}));
        }
    } catch (e: any) { console.log('Error groupByDriver:', e.message); }

    // Let's also check what the ecoProfile 4 looks like and what it tracks
    console.log('\n=== v2/ecodriving/profiles ===');
    try {
        const result = await FrotcomClient.request<any>('v2/ecodriving/profiles');
        console.log(JSON.stringify(result, null, 2).slice(0, 1000));
    } catch (e: any) { console.log('Error v2/ecodriving/profiles:', e.message); }

    // Try v2/ecodriving/profile/4 (the ecoProfileId from the CB1783ME record)
    console.log('\n=== v2/ecodriving/profile/4 ===');
    try {
        const result = await FrotcomClient.request<any>('v2/ecodriving/profile/4');
        console.log(JSON.stringify(result, null, 2).slice(0, 1000));
    } catch (e: any) { console.log('Error v2/ecodriving/profile/4:', e.message); }

    // Maybe the fleet report groups by driver differently - try with driverId in URL
    console.log('\n=== v2/ecodriving/calculate?driverId=308019 ===');
    try {
        const result = await FrotcomClient.request<any>(`v2/ecodriving/calculate?driverId=308019`, 'POST', {
            from_datetime: `${DATE}T00:00:00`,
            to_datetime: `${DATE}T23:59:59`,
        });
        console.log('Result:', JSON.stringify(result, null, 2).slice(0, 500));
    } catch (e: any) { console.log('Error:', e.message); }
}

checkVehicleDetails().catch(console.error);
