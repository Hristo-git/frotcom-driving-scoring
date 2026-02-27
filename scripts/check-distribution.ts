
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const res = await pool.query(`
    SELECT metrics->'vehicles' as vehicles 
    FROM ecodriving_scores s 
    JOIN drivers d ON s.driver_id = d.id 
    WHERE d.name ILIKE '%Yordan Angelov%' 
    AND DATE(s.period_start AT TIME ZONE 'Europe/Sofia') = '2026-02-25'
  `);
  if (res.rows.length > 0) {
    const v = res.rows[0].vehicles;
    console.log('Vehicles JSON:', JSON.stringify(v));
    if (Array.isArray(v) && v.length > 0) {
      const plate = v[0];
      for (let i = 0; i < plate.length; i++) {
        console.log(`${plate[i]}: ${plate.charCodeAt(i)}`);
      }
    }
  }
  await pool.end();
}
check();
