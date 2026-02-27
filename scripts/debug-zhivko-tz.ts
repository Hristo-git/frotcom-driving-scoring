import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkTripsTz() {
    try {
        console.log(`Getting vehicle trips for CB1783ME for exactly Feb 14 00:00 Sofia Time...`);

        const vehicles = await FrotcomClient.request<any[]>('v2/vehicles', 'GET');
        const v = vehicles.find(x => x.licensePlate === 'CB1783ME');
        if (!v) {
            console.log('Vehicle CB1783ME not found.');
            return;
        }

        // Sofia is UTC+2
        // Feb 14 00:00:00 Sofia = Feb 13 22:00:00 UTC
        // Feb 14 23:59:59 Sofia = Feb 14 21:59:59 UTC
        let startD = new Date('2026-02-13T22:00:00Z');
        let endD = new Date('2026-02-14T21:59:59Z');

        const startTs = Math.floor(startD.getTime() / 1000);
        const endTs = Math.floor(endD.getTime() / 1000);

        const trips = await FrotcomClient.request<any[]>(`v2/vehicles/${v.id}/trips?from_datetime=${startTs}&to_datetime=${endTs}`, 'GET');

        let sum = 0;
        let driveTime = 0;
        console.log(`Found ${trips.length} trips:`);

        trips.forEach((t, i) => {
            const m = t.mileage || 0;
            const dts = t.driveTimeSec || 0;
            sum += m;
            driveTime += dts;
            console.log(`Trip ${i + 1}: ${t.startPlace} -> ${t.endPlace} | ${m} km | ${dts}s | Driver: ${t.driverName}`);
        });

        console.log(`\nTotal Mileage: ${sum} km`);
        console.log(`Total Drive Time: ${driveTime} seconds (${Math.floor(driveTime / 3600)}h ${Math.floor((driveTime % 3600) / 60)}m)`);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkTripsTz();
