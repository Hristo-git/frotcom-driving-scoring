/**
 * Fetch and print the Current Frotcom Access Token for the user.
 */
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    try {
        console.log('Fetching Frotcom token...');
        const token = await FrotcomClient.getAccessToken();
        console.log('\n======================================================================');
        console.log('YOUR FROTCOM API ACCESS TOKEN:');
        console.log('======================================================================\n');
        console.log(token);
        console.log('\n======================================================================');
        console.log('Copy the string above and use it in the "Authorize" button on Frotcom.');
        console.log('Format for header if needed: Bearer <token>');
        console.log('======================================================================');
    } catch (error) {
        console.error('Failed to fetch token:', error);
    }
}

run().catch(console.error);
