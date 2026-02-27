import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkConfig() {
    const res = await pool.query(`SHOW TimeZone;`);
    console.table(res.rows);

    // Also test a direct conversion without column references
    const res2 = await pool.query(`
        SELECT '2026-02-25 05:40:05'::timestamp as raw_ts,
               '2026-02-25 05:40:05'::timestamp AT TIME ZONE 'UTC' as as_utc_tstz,
               ('2026-02-25 05:40:05'::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia' as as_sofia_ts
    `);
    console.table(res2.rows);

    await pool.end();
}
checkConfig();
