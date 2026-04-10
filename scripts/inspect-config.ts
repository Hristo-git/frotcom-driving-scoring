
import pool from '../lib/db.js';

async function inspectConfig() {
    try {
        const res = await pool.query("SELECT * FROM scoring_configs");
        console.log("--- Scoring Configs ---");
        console.table(res.rows);
    } catch (e) {
        console.error("Error fetching scoring_configs:", e);
    }
    await pool.end();
}

inspectConfig();
