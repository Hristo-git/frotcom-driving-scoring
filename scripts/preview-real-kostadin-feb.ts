
import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function getRealKostadinStats() {
    const frotcomDriverId = 297309; // Kostadin
    const startIso = '2026-02-01T00:00:00Z';
    const endIso = '2026-02-28T23:59:59Z';

    console.log(`Calculating Real Trips for Kostadin (ID: ${frotcomDriverId}) in Feb 2026...`);

    try {
        // 1. Find which vehicles he drove
        const res = await pool.query(
            `SELECT DISTINCT frotcom_vehicle_id FROM ecodriving_events
             WHERE driver_id = 304 AND started_at >= '2026-02-01' AND started_at < '2026-03-01'`
        );

        const vehicleIds = res.rows.map(r => parseInt(r.frotcom_vehicle_id));
        console.log(`Kostadin drove ${vehicleIds.length} vehicles in Feb:`, vehicleIds);

        let totalPoints = 0;
        let totalDistance = 0;
        let totalFuel = 0;

        for (const vid of vehicleIds) {
            console.log(`Fetching trips for vehicle ${vid}...`);
            try {
                const token = await FrotcomClient.getAccessToken();
                const qs = new URLSearchParams({
                    initial_datetime: startIso,
                    final_datetime: endIso,
                    api_key: token,
                    version: '1'
                });
                const res = await fetch(`https://v2api.frotcom.com/v2/vehicles/${vid}/trips?${qs}`);
                if (!res.ok) {
                    if (res.status === 404 || res.status === 204) continue;
                    throw new Error(`HTTP ${res.status}`);
                }
                const text = await res.text();
                if (!text) continue;
                const trips = JSON.parse(text);
                if (trips && trips.length > 0) {
                    for (const trip of trips) {
                        // Frotcom trips usually have driverId
                        if (trip.driverId === frotcomDriverId) {
                            totalDistance += trip.mileage || 0;
                            totalFuel += trip.fuelConsumption || 0;
                            totalPoints++;
                        }
                    }
                }
            } catch (err: any) {
                console.log(`  Error fetching trips for ${vid}: ${err.message}`);
            }
        }

        console.log(`\n====== REAL FEBRUARY TRIPS SUMMARY for Kostadin ======`);
        console.log(`Total Trips: ${totalPoints}`);
        console.log(`Total Mileage: ${totalDistance.toFixed(2)} km`);
        console.log(`Total Fuel Used: ${totalFuel.toFixed(2)} liters`);
        if (totalDistance > 0) {
            console.log(`Average Consumption: ${((totalFuel / totalDistance) * 100).toFixed(2)} l/100km`);
        } else {
            console.log(`Average Consumption: N/A`);
        }

    } catch (e: any) {
        console.error(e.message);
    } finally {
        await pool.end();
    }
}
getRealKostadinStats();
