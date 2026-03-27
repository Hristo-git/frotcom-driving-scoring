
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_F3YVxPNHn2RJ@ep-delicate-wind-agcen9n4-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require",
    ssl: { rejectUnauthorized: false }
});

async function checkData() {
    try {
        console.log('--- Searching for Driver ---');
        const driverRes = await pool.query("SELECT id, name FROM drivers WHERE name ILIKE '%Живко%'");
        console.log('Drivers found:', driverRes.rows);

        if (driverRes.rows.length === 0) {
            console.log('Driver not found');
            return;
        }

        const driverId = driverRes.rows[0].id;
        const driverName = driverRes.rows[0].name;

        console.log(`\n--- Fetching Data for ${driverName} (ID: ${driverId}) for March 2026 ---`);
        
        // Exact period from screenshot: 1 March 2026 0:00 to 25 March 2026 23:59
        const query = `
            SELECT 
                overall_score, 
                metrics,
                period_start,
                period_end
            FROM ecodriving_scores 
            WHERE driver_id = $1
              AND period_start >= '2026-03-01 00:00:00+02'
              AND period_end <= '2026-03-25 23:59:59+02'
            ORDER BY period_start ASC
        `;
        
        const res = await pool.query(query, [driverId]);
        
        if (res.rows.length === 0) {
            console.log('No data found for this period in ecodriving_scores');
            
            // Check if there's data in potentially slightly different ranges
             const allDataRes = await pool.query("SELECT COUNT(*) FROM ecodriving_scores WHERE driver_id = $1", [driverId]);
             console.log(`Total records for this driver in DB: ${allDataRes.rows[0].count}`);
             
             const recentRes = await pool.query("SELECT period_start, period_end FROM ecodriving_scores WHERE driver_id = $1 ORDER BY period_end DESC LIMIT 5", [driverId]);
             console.log('Most recent records:', recentRes.rows);
             
            return;
        }

        console.log(`Found ${res.rows.length} records.`);
        
        let totalDistance = 0;
        let totalDrivingTime = 0;
        let totalConsumptionWeighted = 0;
        let totalIdlingWeighted = 0;
        let weightedScore = 0;
        let totalWeight = 0;

        res.rows.forEach(row => {
            const m = row.metrics;
            const dist = parseFloat(m.mileage) || 0;
            const time = parseFloat(m.drivingTime) || 0;
            const cons = parseFloat(m.averageConsumption) || 0;
            const idle = parseFloat(m.idleTimePerc) || 0;
            const score = parseFloat(row.overall_score) || 0;

            totalDistance += dist;
            totalDrivingTime += time;
            totalConsumptionWeighted += cons * dist;
            totalIdlingWeighted += idle * dist;
            weightedScore += score * dist;
            totalWeight += dist;
            
            console.log(`Record: ${row.period_start} to ${row.period_end} | Dist: ${dist} | Score: ${score}`);
        });

        const avgScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
        const avgCons = totalWeight > 0 ? totalConsumptionWeighted / totalWeight : 0;
        const avgIdle = totalWeight > 0 ? totalIdlingWeighted / totalWeight : 0;

        console.log('\n--- AGGREGATED SYSTEM DATA vs FROTCOM ---');
        console.log(`System Overall Score: ${avgScore.toFixed(2)}  (Frotcom: 4.3)`);
        console.log(`System Total Distance: ${totalDistance.toFixed(1)} km  (Frotcom: 4,963.2 km)`);
        console.log(`System Avg Consumption: ${avgCons.toFixed(2)} L/100km  (Frotcom: 11.7 L/100km)`);
        console.log(`System Avg Idling: ${avgIdle.toFixed(2)}%  (Frotcom: 30.58%)`);
        
        const totalConsLiters = (avgCons * totalDistance) / 100;
        console.log(`System Total Consumption: ${totalConsLiters.toFixed(1)} L  (Frotcom: 581.1 L)`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkData();
