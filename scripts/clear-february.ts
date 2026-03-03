
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function clearFebruary() {
    console.log("Clearing February ecodriving scores...");
    try {
        const res = await pool.query("DELETE FROM ecodriving_scores WHERE period_start >= '2026-02-01' AND period_end <= '2026-02-28 23:59:59'");
        console.log(`Successfully deleted ${res.rowCount} records.`);
    } catch (err) {
        console.error("Failed to delete records:", err);
    } finally {
        await pool.end();
    }
}
clearFebruary();
