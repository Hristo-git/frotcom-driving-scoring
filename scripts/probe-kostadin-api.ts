
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function probeKostadin() {
    // Kostadin Lubenov Chotrev frotcom_id
    // I need to get it first from the DB
    const driverFrotcomId = "21689"; // I'll assume this based on common patterns or just use the name search first

    try {
        const drivers = await FrotcomClient.getDrivers();
        const kostadin = drivers.find(d => d.name.includes('Chotrev'));
        if (!kostadin) {
            console.log('Kostadin not found in Frotcom');
            return;
        }
        console.log(`Found Kostadin in Frotcom: ${kostadin.name} (ID: ${kostadin.id})`);

        const dates = ['2026-02-26', '2026-02-25'];

        for (const d of dates) {
            const start = `${d}T00:00:00`;
            const end = `${d}T23:59:59`;
            console.log(`\nProbing Frotcom for ${d}...`);
            const results = await FrotcomClient.calculateEcodriving(start, end, [kostadin.id]);

            if (results.length === 0) {
                console.log('  No data returned.');
            } else {
                results.forEach((r, i) => {
                    console.log(`  Record ${i}: dist=${r.mileageCanbus || r.mileageGps}, score=${r.score}, drivers=${JSON.stringify(r.driversId)}`);
                });
            }
        }

    } catch (err) {
        console.error(err);
    }
}

probeKostadin();
