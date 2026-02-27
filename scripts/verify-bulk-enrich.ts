
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verifyEnrichment() {
    try {
        const dateStr = '2026-02-25';
        console.log(`--- Verification for ${dateStr} ---`);

        const res = await pool.query(`
            SELECT d.name, s.metrics->'eventCounts' as counts, s.overall_score, metrics->'mileage' as mileage
            FROM ecodriving_scores s
            JOIN drivers d ON s.driver_id = d.id
            WHERE DATE(s.period_start AT TIME ZONE 'Europe/Sofia') = $1
            AND s.metrics->'eventCounts' IS NOT NULL
            LIMIT 10
        `, [dateStr]);

        console.table(res.rows);
    } catch (err: any) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}

verifyEnrichment();
