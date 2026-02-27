import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifySpecificDriver() {
    console.log('Verifying data for driver "Живко Георгиев Иванов - Петрич" on 2026-02-14');

    const db = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await db.connect();

        const res = await db.query(`
            SELECT d.name, es.overall_score, es.metrics 
            FROM ecodriving_scores es
            JOIN drivers d ON es.driver_id = d.id
            WHERE d.name LIKE '%Живко Георгиев Иванов%'
            AND es.period_start >= '2026-02-14T00:00:00' 
            AND es.period_start <= '2026-02-14T23:59:59'
        `);

        if (res.rows.length === 0) {
            console.log('Driver not found for this date.');
            return;
        }

        const score = res.rows[0];
        console.log('Name:', score.name);
        console.log('Overall Score (DB):', score.overall_score);
        console.log('Metrics JSON:');
        console.dir(score.metrics, { depth: null });

    } catch (err) {
        console.error('Failed:', err);
    } finally {
        await db.end();
    }
}

verifySpecificDriver();
