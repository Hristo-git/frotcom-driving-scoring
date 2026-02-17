
const { FrotcomClient } = require('../lib/frotcom');
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { syncDriversAndVehicles } from '../lib/sync';

async function run() {
    console.log('Starting sync...');
    await syncDriversAndVehicles();
    console.log('Sync finished.');
}

run();
