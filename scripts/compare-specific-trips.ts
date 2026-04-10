import pool from '../lib/db';

async function test() {
    console.log("Marjan Trajkovski's 9.65 trip:");
    const res1 = await pool.query(`
        SELECT * FROM ecodriving_scores es 
        JOIN drivers d ON es.driver_id = d.id 
        WHERE d.name = 'Марјан Трајковски - Скопие' 
          AND overall_score = '9.65'
        LIMIT 1;
    `);
    console.log(JSON.stringify(res1.rows[0], null, 2));

    console.log("\nYordan Angelov's 5.10 trip:");
    const res2 = await pool.query(`
        SELECT * FROM ecodriving_scores es 
        JOIN drivers d ON es.driver_id = d.id 
        WHERE d.name = 'Yordan Angelov - Русе' 
          AND overall_score = '5.10'
        LIMIT 1;
    `);
    console.log(JSON.stringify(res2.rows[0], null, 2));

    await pool.end();
}
test().catch(console.error);
