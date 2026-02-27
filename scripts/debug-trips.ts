
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const VEHICLE_ID = 320225; // CB1783ME
const DATE = '2026-02-14';

async function checkTrips() {
    // First, get the full structure of a trip
    console.log('=== Full structure of first trip record ===');
    const tripsNow = await FrotcomClient.request<any[]>(`v2/vehicles/${VEHICLE_ID}/trips`);
    console.log('First trip:', JSON.stringify(tripsNow[0], null, 2));
    console.log('\nAll trip fields:', Object.keys(tripsNow[0] || {}));

    const totalMileageNow = tripsNow.reduce((s: number, t: any) => s + (t.mileageCanbus || t.distance || t.mileage || t.km || 0), 0);
    console.log('\nCurrent period total trips:', tripsNow.length);
    console.log('Total distance (current):', totalMileageNow.toFixed(1));

    // Now try to paginate / get more trips - maybe there's a page or limit param
    console.log('\n=== Try fetching with limit/page for Feb 14 ===');
    const tripsLarge = await FrotcomClient.request<any[]>(`v2/vehicles/${VEHICLE_ID}/trips?from_datetime=2026-02-14T00:00:00&to_datetime=2026-02-14T23:59:59&limit=1000`);
    console.log('With from_datetime limit=1000:', tripsLarge.length, 'trips');

    // Sort and filter for Feb 14
    const feb14Trips = tripsLarge.filter((t: any) => {
        const started = t.started || t.start || t.date || '';
        return started.startsWith(DATE);
    });
    console.log('Feb 14 trips:', feb14Trips.length);

    if (feb14Trips.length > 0) {
        const feb14Total = feb14Trips.reduce((s: number, t: any) => {
            const dist = t.mileageCanbus || t.mileage || t.distance || t.km || t.tripDistance || 0;
            return s + dist;
        }, 0);
        console.log('Feb 14 total distance:', feb14Total.toFixed(1), 'km');
        feb14Trips.forEach((t: any) => {
            console.log(`  Trip ${t.id}: started=${t.started}, dist=${t.mileageCanbus || t.distance || t.km}km, driver=${t.driverId || t.driver}`);
        });
    }

    // Try with offset parameter
    console.log('\n=== Try offset pagination ===');
    try {
        const tripsPage2 = await FrotcomClient.request<any[]>(`v2/vehicles/${VEHICLE_ID}/trips?offset=10&limit=100`);
        console.log('Page 2 (offset=10):', tripsPage2.length, 'trips');
        if (tripsPage2.length > 0) {
            console.log('First trip started:', tripsPage2[0]?.started);
            console.log('Last trip started:', tripsPage2[tripsPage2.length - 1]?.started);
        }
    } catch (e: any) { console.log('Error:', e.message); }

    // Try fetching ALL vehicles trips for Feb 14 (maybe via different endpoint)
    console.log('\n=== GET v2/vehicles (all) with trip summary for Feb 14 ===');
    const vehicles = await FrotcomClient.request<any[]>('v2/vehicles');
    const cb1783 = vehicles.find((v: any) => v.licensePlate === 'CB1783ME' || v.id === VEHICLE_ID);
    console.log('CB1783ME vehicle data:', JSON.stringify(cb1783, null, 2));
}

checkTrips().catch(console.error);
