
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function findKostadinId() {
    try {
        const drivers = await FrotcomClient.getDrivers();
        const kostadins = drivers.filter(d => d.name.includes('Костадин'));
        console.log("Found Kostadins:");
        kostadins.forEach(k => console.log(`  ${k.id}: ${k.name}`));
    } catch (err) {
        console.error(err);
    }
}
findKostadinId();
