
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log('Fetching Goran (362) for Feb 2026 via calculateEcodriving...');

    try {
        const scores = await FrotcomClient.calculateEcodriving(
            '2026-02-01T00:00:00',
            '2026-02-28T23:59:59',
            [362]
        );

        console.log('Result:');
        console.log(JSON.stringify(scores, null, 2));
    } catch (error) {
        console.error('API Call failed:', error);
    }
}

main().catch(console.error);
