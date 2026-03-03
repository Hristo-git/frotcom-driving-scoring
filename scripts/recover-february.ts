
import { fetchAndStoreEcodriving } from '../lib/ecodriving';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function syncScoreForDate(dateStr: string) {
    const start = `${dateStr}T00:00:00`;
    const end = `${dateStr}T23:59:59`;

    console.log(`\n--- Recovering Scores for Date: ${dateStr} ---`);
    try {
        await fetchAndStoreEcodriving(start, end);
        console.log(`  Successfully stored/updated scores.`);
    } catch (err) {
        console.error(`  FAILED for ${dateStr}:`, err);
    }
}

async function verifyFinalTotals() {
    const frotcomIds = ['283043', '269157']; // Hristo Petrov, Georgi Valchev
    console.log("\n--- FINAL VERIFICATION (February Totals) ---");
    for (const fid of frotcomIds) {
        const res = await pool.query(`
            SELECT 
                d.name,
                SUM((metrics->>'mileage')::numeric) as total_mileage,
                SUM(overall_score * (metrics->>'mileage')::numeric) / NULLIF(SUM((metrics->>'mileage')::numeric), 0) as weighted_score
            FROM ecodriving_scores s
            JOIN drivers d ON s.driver_id = d.id
            WHERE d.frotcom_id = $1
              AND period_start >= '2026-02-01T00:00:00'
              AND period_end <= '2026-02-28T23:59:59'
            GROUP BY d.name
        `, [fid]);

        if (res.rows.length > 0) {
            const row = res.rows[0];
            console.log(`${row.name}:`);
            console.log(`  Mileage: ${parseFloat(row.total_mileage).toFixed(1)} km`);
            console.log(`  Weight Score: ${parseFloat(row.weighted_score).toFixed(2)}`);
        } else {
            console.log(`No data for Frotcom ID ${fid}`);
        }
    }
}

async function runRecovery() {
    const dates = [];
    for (let day = 1; day <= 28; day++) {
        dates.push(`2026-02-${day.toString().padStart(2, '0')}`);
    }

    console.log(`Starting score recovery for ${dates.length} days of February...`);

    for (const date of dates) {
        await syncScoreForDate(date);
    }

    await verifyFinalTotals();
    await pool.end();
}

runRecovery();
