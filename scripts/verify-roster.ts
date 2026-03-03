
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyAllDrivers() {
    console.log('Fetching all Frotcom drivers...');
    try {
        const drivers = await FrotcomClient.request<any[]>('v2/drivers', 'GET');
        console.log(`Loaded ${drivers.length} drivers from Frotcom.`);

        const kostadin = drivers.find(d => d.id === 297309 || (d.driverName && d.driverName.includes('Костадин')));
        if (kostadin) {
            console.log('Found Kostadin in Roster:', kostadin.id, kostadin.driverName);
        } else {
            console.log('Kostadin NOT FOUND IN FROTCOM ROSTER!');
        }
    } catch (err: any) {
        console.error('Error:', err.message);
    }
}
verifyAllDrivers();
