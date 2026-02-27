import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkVehicleQuery() {
    try {
        const query = `
            SELECT 
                v.license_plate,
                v.metadata->>'manufacturer' as manufacturer,
                v.metadata->>'model' as model,
                COUNT(es.id) as count,
                SUM(CAST(es.metrics->>'mileage' AS NUMERIC)) as total_distance,
                AVG(CAST(es.metrics->>'averageConsumption' AS NUMERIC)) as avg_consumption,
                AVG(es.overall_score) as avg_score
            FROM vehicles v
            JOIN ecodriving_scores es 
              ON v.license_plate IN (
                   SELECT jsonb_array_elements_text(es.metrics->'vehicles')
                 )
            WHERE es.period_start >= '2026-02-01' 
              AND es.period_start <= '2026-02-28'
            GROUP BY v.license_plate, manufacturer, model
            ORDER BY count DESC
            LIMIT 10;
        `;
        const res = await pool.query(query);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

checkVehicleQuery();
