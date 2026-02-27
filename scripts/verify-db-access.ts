
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function main() {
    try {
        console.log('Connecting to Neon database...');
        const client = await pool.connect();
        console.log('Connected successfully!');

        console.log('\nRunning analysis query...');
        const res = await client.query(`
            SELECT 
                date(period_start) as day, 
                COUNT(DISTINCT driver_id) as drivers, 
                ROUND(AVG((metrics->>'score')::numeric), 2) as avg_frotcom_score,
                ROUND(SUM((metrics->>'mileage')::numeric), 2) as total_distance
            FROM ecodriving_scores 
            GROUP BY day 
            ORDER BY day DESC 
            LIMIT 5;
        `);

        console.table(res.rows);
        client.release();
    } catch (err) {
        console.error('Error connecting to database:', err);
    } finally {
        await pool.end();
    }
}

main();
