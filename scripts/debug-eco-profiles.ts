
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkEcoProfiles() {
    // We know v2/ecodriving/profiles works! Get full list
    console.log('=== Full ecoProfiles list ===');
    try {
        const profiles = await FrotcomClient.request<any[]>('v2/ecodriving/profiles');
        console.log(`Got ${profiles.length} profiles`);
        profiles.forEach((p: any) => {
            console.log(`Profile ${p.id}: ${p.name} - ${p.description}`);
        });
    } catch (e: any) { console.log('Error:', e.message); }

    // The Frotcom report header says "Персонализирана оценка" (Personalized score)
    // Let's try v2/ecodriving/calculate with ecoProfileId=4 explicitly  
    // Also try with "detailed" or "per driver" mode
    console.log('\n=== calculateEcodriving ecoProfileId=4 + groupByDriver ===');
    try {
        const result = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: '2026-02-14T00:00:00',
            to_datetime: '2026-02-14T23:59:59',
            ecoProfileId: 4,
            groupByDriver: true,
        });
        if (Array.isArray(result)) {
            console.log(`Records: ${result.length}`);
            const zhivko = result.find((r: any) =>
                (r.drivers && JSON.stringify(r.drivers).includes('Живко')) ||
                (r.driversId && r.driversId.includes(308019))
            );
            console.log('Живко record:', JSON.stringify(zhivko, null, 2));

            // Check if any record has 463 km
            const big = result.filter((r: any) => (r.mileageCanbus || 0) > 400);
            console.log(`\nRecords with >400km: ${big.length}`);
            big.forEach((r: any) => console.log(`  ${r.licensePlate}: ${r.mileageCanbus}km, drivers=${JSON.stringify(r.driversId)}`));
        }
    } catch (e: any) { console.log('Error groupByDriver:', e.message); }

    // What if the Frotcom report uses a LONGER period in one API request?
    // "From 14 feb 00:00 to 14 feb 23:59" in the UI may reference PREVIOUS accumulation
    // Let's try fetching JUST CB1783ME vehicle ID explicitly
    console.log('\n=== calculateEcodriving vehicleIds=[320225] ===');
    try {
        const result = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: '2026-02-14T00:00:00',
            to_datetime: '2026-02-14T23:59:59',
            vehicleIds: [320225],
        });
        if (Array.isArray(result)) {
            console.log(`Records returned: ${result.length}`);
            result.forEach((r: any) => {
                console.log(`  ${r.licensePlate}: canbus=${r.mileageCanbus}, drivers=${JSON.stringify(r.driversId)}`);
            });
        }
    } catch (e: any) { console.log('Error vehicleIds:', e.message); }

    // Critical test: Try fetching a WIDER date range - maybe Frotcom cumulates
    // "week to date" or "period" by default?
    console.log('\n=== calculateEcodriving WIDER range (Feb 10-14) for CB1783ME ===');
    try {
        const result = await FrotcomClient.calculateEcodriving(
            '2026-02-10T00:00:00',
            '2026-02-14T23:59:59',
            undefined,
            [320225]
        );
        if (Array.isArray(result)) {
            console.log(`Records: ${result.length}`);
            const cb = result.find((r: any) => r.licensePlate === 'CB1783ME');
            console.log('CB1783ME Feb10-14:', JSON.stringify(cb, null, 2));
        }
    } catch (e: any) { console.log('Error wider range:', e.message); }

    // Try fetching ecodriving for 1 month range to see if 463km appears
    console.log('\n=== calculateEcodriving MONTH range (Feb 1-14) for CB1783ME ===');
    try {
        const result = await FrotcomClient.calculateEcodriving(
            '2026-02-01T00:00:00',
            '2026-02-14T23:59:59',
            undefined,
            [320225]
        );
        if (Array.isArray(result)) {
            const cb = result.find((r: any) => r.licensePlate === 'CB1783ME');
            console.log('CB1783ME Feb1-14:', JSON.stringify(cb, null, 2));
        }
    } catch (e: any) { console.log('Error month range:', e.message); }
}

checkEcoProfiles().catch(console.error);
