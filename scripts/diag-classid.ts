import pool from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
(async () => {
    const r = await pool.query(`
        SELECT
            (metadata->>'classId')::int as class_id,
            metadata->>'className' as class_name,
            CASE WHEN license_plate ~ '-[Бб]$' THEN 'B' WHEN license_plate ~ '-[Цц]$' THEN 'C' ELSE 'no suffix' END as suffix,
            COUNT(*) as cnt
        FROM vehicles
        GROUP BY 1,2,3
        ORDER BY 1,3
    `);
    r.rows.forEach((r: any) => console.log(`classId=${r.class_id} | ${r.class_name} | suffix=${r.suffix} | cnt=${r.cnt}`));
    await pool.end();
})().catch(console.error);
