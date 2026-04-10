import pool from '../lib/db';

async function test() {
    const driverId = 355; // Yordan
    const day = '2026-03-13'; // From the 5.10 trip
    
    console.log(`Checking ecodriving_events for driver ${driverId} on ${day}...`);
    const res = await pool.query(`
        SELECT event_type, acceleration, started_at 
        FROM ecodriving_events 
        WHERE driver_id = $1 
          AND DATE((started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Sofia') = $2
    `, [driverId, day]);
    
    console.log(`Found ${res.rows.length} events:`);
    res.rows.forEach(r => {
        console.log(`- ${r.event_type} | Acc: ${r.acceleration} | Time: ${r.started_at}`);
    });

    await pool.end();
}
test().catch(console.error);
