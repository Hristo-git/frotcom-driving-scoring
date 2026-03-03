
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function inspectDrivers() {
    try {
        const drivers = await FrotcomClient.getDrivers();
        const kostadin = drivers.find(d => d.name.includes('Chotrev'));
        console.log('Kostadin Frotcom Object:');
        console.dir(kostadin, { depth: null });

        const martin = drivers.find(d => d.name.includes('Martin Kostadinov'));
        console.log('\nMartin Kostadinov Frotcom Object:');
        console.dir(martin, { depth: null });

    } catch (err) {
        console.error(err);
    }
}

inspectDrivers();
