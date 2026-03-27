import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    const res = await pool.query(\
        SELECT d.name, s.overall_score, (s.metrics->>'mileage')::numeric as mileage, s.updated_at
        FROM ecodriving_scores s
        JOIN drivers d ON s.driver_id = d.id
        WHERE s.period_start = '2026-03-15T00:00:00'
        ORDER BY s.updated_at ASC limit 10
    \);
    console.table(res.rows);
    await pool.end();
}
main().catch(console.error);
