
import { fetchAndStoreEcodriving } from '../lib/ecodriving';
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testEcodriving() {
    console.log('Starting ecodriving fetch test...');
    const start = '2026-02-01T00:00:00';
    const end = '2026-02-07T23:59:59';

    await fetchAndStoreEcodriving(start, end);

    // Verify data in DB
    const db = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await db.connect();

        const countRes = await db.query('SELECT COUNT(*) FROM ecodriving_scores');
        console.log(`Ecodriving Scores in DB: ${countRes.rows[0].count}`);

        const sampleScores = await db.query(`
            SELECT d.name, es.overall_score, es.metrics 
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            LIMIT 5
        `);
        console.log('Sample Scores:', sampleScores.rows);

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        await db.end();
    }
}

testEcodriving();
