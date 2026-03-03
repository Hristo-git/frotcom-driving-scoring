
import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkEventsForVehicles() {
    const frotcomDriverId = 297309; // Kostadin
    // ISO string for February
    const df = '1738368000'; // Feb 1 2026 UTC
    const dt = '1740787199'; // Feb 28 2026 UTC

    // Some Frotcom Vehicle IDs from the screenshot
    const vids = [
        315954, 317576, 329231, 343480, 331619,
        327541, 324538, 324532, 327529, 320163
    ];

    console.log(`Checking ecodriving events in API for driver ${frotcomDriverId} across his 10 vehicles in Feb...`);

    let totalEvents = 0;

    for (const vid of vids) {
        try {
            const token = await FrotcomClient.getAccessToken();
            // Events endpoint: GET /v2/ecodriving/events/{vehicleId}/{driverId}
            const qs = new URLSearchParams({
                df: '2026-02-01T00:00:00Z',
                dt: '2026-02-28T23:59:59Z',
                api_key: token,
                version: '1'
            });
            const res = await fetch(`https://v2api.frotcom.com/v2/ecodriving/events/${vid}/${frotcomDriverId}?${qs}`);
            if (!res.ok) {
                if (res.status !== 404 && res.status !== 400 && res.status !== 204) {
                    console.log(`HTTP ${res.status} for vid ${vid}`);
                }
                continue;
            }
            const text = await res.text();
            if (!text) continue;
            const events = JSON.parse(text);

            if (Array.isArray(events) && events.length > 0) {
                console.log(`  Vehicle ${vid}: Found ${events.length} events for Kostadin!`);
                totalEvents += events.length;
            } else {
                console.log(`  Vehicle ${vid}: 0 events`);
            }
        } catch (e: any) {
            console.log(`Error on ${vid}: ${e.message}`);
        }
    }

    console.log(`\nTotal events found for Kostadin across these 10 vehicles: ${totalEvents}`);
}
checkEventsForVehicles();
