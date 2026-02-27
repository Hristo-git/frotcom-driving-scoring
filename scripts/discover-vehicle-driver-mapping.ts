/**
 * Discovers how Frotcom links vehicles to drivers.
 * Tests:
 *   1. GET /v2/drivers/{id}          — does the driver object contain a vehicleId?
 *   2. GET /v2/vehicles/{id}         — does the vehicle object contain a driverId?
 *   3. POST /v2/couplings/couplingOccurrences — coupling history for a vehicle
 *   4. GET /v2/drivers (all)         — show full driver object to spot any vehicle fields
 */

import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DRIVER_FROTCOM_ID = 308019;   // Живко Георгиев Иванов - Петрич
const VEHICLE_ID        = 320225;   // CB1783ME
const DATE              = '2026-02-14';

async function run() {
    // ─── 1. Driver detail ────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════');
    console.log(`1. GET /v2/drivers/${DRIVER_FROTCOM_ID}`);
    console.log('══════════════════════════════════════════');
    try {
        const driver = await FrotcomClient.request<any>(`v2/drivers/${DRIVER_FROTCOM_ID}`);
        console.log('All keys:', Object.keys(driver));
        console.log(JSON.stringify(driver, null, 2));
    } catch (e: any) { console.error('Error:', e.message); }

    // ─── 2. Vehicle detail ───────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════');
    console.log(`2. GET /v2/vehicles/${VEHICLE_ID}`);
    console.log('══════════════════════════════════════════');
    try {
        const vehicle = await FrotcomClient.request<any>(`v2/vehicles/${VEHICLE_ID}`);
        console.log('All keys:', Object.keys(vehicle));
        console.log(JSON.stringify(vehicle, null, 2));
    } catch (e: any) { console.error('Error:', e.message); }

    // ─── 3. Coupling occurrences for this vehicle on Feb 14 ─────────────────
    console.log('\n══════════════════════════════════════════');
    console.log('3. POST /v2/couplings/couplingOccurrences');
    console.log('══════════════════════════════════════════');
    try {
        const result = await FrotcomClient.request<any>('v2/couplings/couplingOccurrences', 'POST', {
            vehicleId: VEHICLE_ID,
            from_datetime: `${DATE}T00:00:00+02:00`,
            to_datetime:   `${DATE}T23:59:59+02:00`,
        });
        console.log(`Records returned: ${Array.isArray(result) ? result.length : 'N/A (not array)'}`);
        if (Array.isArray(result) && result.length > 0) {
            console.log('First record keys:', Object.keys(result[0]));
            console.log(JSON.stringify(result.slice(0, 3), null, 2));
        } else {
            console.log(JSON.stringify(result, null, 2));
        }
    } catch (e: any) { console.error('Error:', e.message); }

    // ─── 4. Coupling occurrences with assetId (driver as asset) ─────────────
    console.log('\n══════════════════════════════════════════');
    console.log('4. POST /v2/couplings/couplingOccurrences (by assetId = driver)');
    console.log('══════════════════════════════════════════');
    try {
        const result = await FrotcomClient.request<any>('v2/couplings/couplingOccurrences', 'POST', {
            assetId: DRIVER_FROTCOM_ID,
            from_datetime: `${DATE}T00:00:00+02:00`,
            to_datetime:   `${DATE}T23:59:59+02:00`,
        });
        console.log(`Records: ${Array.isArray(result) ? result.length : typeof result}`);
        console.log(JSON.stringify(Array.isArray(result) ? result.slice(0, 2) : result, null, 2));
    } catch (e: any) { console.error('Error:', e.message); }

    // ─── 5. All drivers — show one full object ───────────────────────────────
    console.log('\n══════════════════════════════════════════');
    console.log('5. GET /v2/drivers — full object sample');
    console.log('══════════════════════════════════════════');
    try {
        const drivers = await FrotcomClient.request<any[]>('v2/drivers');
        console.log(`Total drivers: ${drivers.length}`);
        if (drivers.length > 0) {
            console.log('All keys on first driver:', Object.keys(drivers[0]));
            // Find Живко specifically
            const zhivko = drivers.find(d => d.id === DRIVER_FROTCOM_ID);
            if (zhivko) {
                console.log('\nЖивко full object:');
                console.log(JSON.stringify(zhivko, null, 2));
            } else {
                console.log('\nFirst driver full object:');
                console.log(JSON.stringify(drivers[0], null, 2));
            }
        }
    } catch (e: any) { console.error('Error:', e.message); }

    // ─── 6. All vehicles — show CB1783ME full object ─────────────────────────
    console.log('\n══════════════════════════════════════════');
    console.log('6. GET /v2/vehicles — full object for CB1783ME');
    console.log('══════════════════════════════════════════');
    try {
        const vehicles = await FrotcomClient.request<any[]>('v2/vehicles');
        const cb = vehicles.find(v => v.licensePlate === 'CB1783ME');
        if (cb) {
            console.log('All keys:', Object.keys(cb));
            console.log(JSON.stringify(cb, null, 2));
        } else {
            console.log('CB1783ME not found. First vehicle:');
            console.log(JSON.stringify(vehicles[0], null, 2));
        }
    } catch (e: any) { console.error('Error:', e.message); }

    await pool.end();
}

run().catch(console.error);
