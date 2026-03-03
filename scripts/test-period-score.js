
const { FrotcomClient } = require('./lib/frotcom');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    const client = new FrotcomClient();
    const login = await client.login(
        process.env.FROTCOM_USERNAME,
        process.env.FROTCOM_PASSWORD,
        process.env.FROTCOM_ACCOUNT
    );

    if (!login) return console.log('Login failed');

    console.log('Fetching Goran (362) for Feb 2026...');
    const scores = await client.getEcodrivingScores(
        '2026-02-01T00:00:00Z',
        '2026-02-28T23:59:59Z',
        362
    );

    console.log('Result:');
    console.log(JSON.stringify(scores, null, 2));
}

main().catch(console.error);
