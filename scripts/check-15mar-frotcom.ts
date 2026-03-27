
import { FrotcomClient } from '../lib/frotcom.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    const periodStartStr = '2026-03-15T00:00:00';
    const periodEndStr   = '2026-03-15T23:59:59';
    
    console.log(`Fetching Frotcom data for ${periodStartStr} grouped by VEHICLE...`);
    
    try {
        const res = await FrotcomClient.calculateEcodriving(
            periodStartStr,
            periodEndStr,
            undefined, // all drivers
            undefined, // all vehicles
            'vehicle'  // Group by vehicle
        );
        
        if (!res || !Array.isArray(res)) {
            console.log('No valid response from Frotcom', res);
            return;
        }
        
        let totalMileageRaw = 0;
        console.log(`Found ${res.length} vehicle records in Frotcom.`);
        
        for (const record of res) {
            const mil = record.mileage || 0;
            const vName = record.vehicleLicensePlate || 'Unknown Vehicle';
            totalMileageRaw += mil;
            console.log(`${vName.padEnd(20)} - ${mil.toFixed(2)} km`);
        }
        console.log(`\nTOTAL MILEAGE FROM FROTCOM API (per vehicle): ${totalMileageRaw.toFixed(2)} km`);
        
    } catch (e) {
         console.error(e);
    }
}

main().catch(console.error);
