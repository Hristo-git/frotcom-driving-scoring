
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function exploreEndpoints() {
    console.log('=== Exploring ecoProfile endpoint ===');
    try {
        const result = await FrotcomClient.request<any>('v2/ecoprofiles');
        console.log('ecoProfiles:', JSON.stringify(result, null, 2).slice(0, 1000));
    } catch (e: any) { console.log('Error v2/ecoprofiles:', e.message); }

    // Try the report-style endpoint that Frotcom UI might use
    console.log('\n=== v2/ecodriving/scores ===');
    try {
        const result = await FrotcomClient.request<any>('v2/ecodriving/scores', 'POST', {
            from_datetime: '2026-02-14T00:00:00',
            to_datetime: '2026-02-14T23:59:59',
        });
        console.log('Response:', JSON.stringify(result, null, 2).slice(0, 500));
    } catch (e: any) { console.log('Error v2/ecodriving/scores:', e.message); }

    // Try the ecodriving/report endpoint
    console.log('\n=== v2/ecodriving/report ===');
    try {
        const result = await FrotcomClient.request<any>('v2/ecodriving/report', 'POST', {
            from_datetime: '2026-02-14T00:00:00',
            to_datetime: '2026-02-14T23:59:59',
        });
        console.log('Response:', JSON.stringify(result, null, 2).slice(0, 500));
    } catch (e: any) { console.log('Error v2/ecodriving/report:', e.message); }

    // Try with a specific eco profile ID for CB1783ME 
    // from debug-cb1783me output we know ecoProfileId is e.g. 4 or similar
    console.log('\n=== calculateEcodriving with ecoProfileId ===');
    try {
        const result = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: '2026-02-14T00:00:00',
            to_datetime: '2026-02-14T23:59:59',
            ecoProfileId: 1, // try profile 1
        });
        const cb1783 = Array.isArray(result) ? result.find((r: any) => r.licensePlate === 'CB1783ME') : null;
        console.log('CB1783ME with ecoProfile 1:', JSON.stringify(cb1783, null, 2));
        console.log('Total records:', Array.isArray(result) ? result.length : 'N/A');
    } catch (e: any) { console.log('Error with ecoProfileId:', e.message); }

    // What if the calculateEcodriving endpoint requires different date format?
    // Try ISO with timezone offset
    console.log('\n=== calculateEcodriving with timezone offset ===');
    try {
        const result = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: '2026-02-14T00:00:00+02:00',
            to_datetime: '2026-02-14T23:59:59+02:00',
        });
        const cb1783 = Array.isArray(result) ? result.find((r: any) => r.licensePlate === 'CB1783ME') : null;
        console.log('CB1783ME with TZ offset:', JSON.stringify(cb1783, null, 2));
    } catch (e: any) { console.log('Error with TZ offset:', e.message); }

    // Check what ALL the fields look like for CB1783ME record
    console.log('\n=== Full CB1783ME record from calculateEcodriving ===');
    try {
        const result = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from_datetime: '2026-02-14T00:00:00',
            to_datetime: '2026-02-14T23:59:59',
            groupBy: 'driver',
            group_by: 'driver'
        });
        const cb1783 = Array.isArray(result) ? result.find((r: any) => r.licensePlate === 'CB1783ME') : null;
        console.log('ALL fields:', JSON.stringify(cb1783, null, 2));
        // Also check if there are multiple records for CB1783ME
        const allCb1783 = Array.isArray(result) ? result.filter((r: any) => r.licensePlate === 'CB1783ME') : [];
        console.log('Total CB1783ME records:', allCb1783.length);
        console.log('First record in group_by array:', JSON.stringify(result[0], null, 2));
        console.log('Fleet total mileageCanbus:',
            Array.isArray(result) ? result.reduce((s: number, r: any) => s + (r.mileageCanbus || 0), 0).toFixed(0) : 'N/A'
        );
    } catch (e: any) { console.log('Error:', e.message); }
}

exploreEndpoints().catch(console.error);
