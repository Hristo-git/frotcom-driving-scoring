/**
 * Compare live Frotcom API scores (Mar 1-27) vs xlsx ground truth
 */
import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';

const START = '2026-03-01';
const END   = '2026-03-27';

// Ground truth from xlsx file
const XLSX_SCORES: Record<string, number> = {
    'Martin Todorov':    7.290,
    'Stefan Serafimov':  9.089,
    'Lyuben Vasilev':    4.856,  // Lyuben Vasilev - Петрич
    'Благой':            5.552,
    'Вангел':            4.376,
    'Димитър':           4.748,
    'Живко':             4.508,
    'Иван Владимиров':   6.249,
    'Иван Илиев':        6.048,
    'Илия':              3.525,
    'Костадин':          7.343,
    'Любен Василев':     5.108,  // Любен Василев-Петрич (short)
    'Мартин Данаилов':   6.067,
    'Мартин Николаев':   5.659,
    'Николай':           4.153,
    'Петър':             7.518,
    'Стефан Антонов':    6.113,
    'Христо':            5.384,
};

async function run() {
    console.log('Authorizing...');
    const records = await FrotcomClient.calculateEcodriving(START, END, undefined, undefined, 'driver');
    console.log(`Got ${records.length} records from API\n`);

    // Print raw fields for first record to understand structure
    if (records.length > 0) {
        const r = records[0];
        console.log('=== Sample API record fields ===');
        console.log('driverId:', r.driverId);
        console.log('score:', r.score);
        console.log('scoreCustomized:', r.scoreCustomized);
        console.log('mileageCanbus:', r.mileageCanbus);
        console.log('mileageGps:', r.mileageGps);
        console.log('idleTimePerc:', r.idleTimePerc);
        console.log('highRPMPerc:', r.highRPMPerc);
        console.log('\n');
    }

    // Get driver names
    const dbRes = await pool.query('SELECT id, frotcom_id, name FROM drivers');
    const nameMap = new Map<string, string>();
    dbRes.rows.forEach((r: any) => nameMap.set(r.frotcom_id?.toString(), r.name));

    console.log('Driver'.padEnd(45) + 'score'.padStart(8) + 'custm'.padStart(8) + 'km'.padStart(8));
    console.log('─'.repeat(72));

    const petrichRecords = records
        .filter((r: any) => {
            const name = nameMap.get(r.driverId?.toString()) || '';
            return name.includes('Петрич') || name.includes('Petar') || name.includes('Martin') || name.includes('Stefan') || name.includes('Lyuben');
        })
        .sort((a: any, b: any) => (parseFloat(b.scoreCustomized || b.score) - parseFloat(a.scoreCustomized || a.score)));

    petrichRecords.forEach((r: any) => {
        const name = nameMap.get(r.driverId?.toString()) || `frotcom_id:${r.driverId}`;
        const km = (r.mileageCanbus ?? r.mileageGps ?? 0).toFixed(1);
        console.log(
            name.substring(0, 44).padEnd(45) +
            parseFloat(r.score || 0).toFixed(3).padStart(8) +
            parseFloat(r.scoreCustomized || 0).toFixed(3).padStart(8) +
            km.padStart(8)
        );
    });

    await pool.end();
}
run().catch(console.error);
