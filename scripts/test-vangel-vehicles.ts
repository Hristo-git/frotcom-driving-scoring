import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';

async function main() {
    const start = '2026-03-01T00:00:00.000Z';
    const end = '2026-03-25T23:59:59.999Z';
    
    // Get all trips for Vangel
    const tripsRes = await pool.query(`
        SELECT 
            es.id as trip_id,
            v.license_plate,
            CAST(es.metrics->>'mileage' AS NUMERIC) as distance,
            es.metrics->'eventCounts' as events
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        JOIN vehicles v ON v.license_plate = ANY(ARRAY(SELECT jsonb_array_elements_text(es.metrics->'vehicles')))
        WHERE d.name LIKE '%Вангел%'
          AND es.period_start >= $1 
          AND es.period_end <= $2
    `, [start, end]);

    const vehicleData = new Map<string, any>();
    
    // Group by vehicle
    for (const row of tripsRes.rows) {
        if (!vehicleData.has(row.license_plate)) {
            vehicleData.set(row.license_plate, {
                license_plate: row.license_plate,
                distance: 0,
                events: {}
            });
        }
        const v = vehicleData.get(row.license_plate);
        v.distance += parseFloat(row.distance) || 0;
        
        if (row.events) {
            for (const [key, val] of Object.entries(row.events)) {
                v.events[key] = (v.events[key] || 0) + (val as number);
            }
        }
    }

    // Now refine the exact counts by doing a granular query per vehicle
    const eventRes = await pool.query(`
        SELECT 
            v.license_plate,
            ev.event_type,
            COUNT(*) as count
        FROM ecodriving_events ev
        JOIN drivers d ON ev.driver_id = d.id
        JOIN vehicles v ON ev.vehicle_id = v.id
        WHERE d.name LIKE '%Вангел%'
          AND ev.started_at >= $1
          AND ev.started_at <= $2
          AND (
            (ev.event_type = 'lateralAcceleration' AND ev.acceleration >= 3.36) OR
            (ev.event_type IN ('lowSpeedAcceleration', 'highSpeedAcceleration') AND ev.acceleration >= 1.25) OR
            (ev.event_type IN ('lowSpeedBreak', 'highSpeedBreak') AND ev.acceleration <= -2.2)
          )
        GROUP BY v.license_plate, ev.event_type
    `, [start, end]);

    for (const row of eventRes.rows) {
        const v = vehicleData.get(row.license_plate);
        if (v) {
            v.events[row.event_type] = parseInt(row.count);
        }
    }

    const engine = new ScoringEngine();
    let totalD = 0;
    let weightedScore = 0;

    console.log("=== PER VEHICLE SCORES ===");
    for (const v of vehicleData.values()) {
        const metrics = {
            mileage: v.distance,
            eventCounts: v.events,
            idleTimePerc: 0,
            highRPMPerc: 0
        };
        const s = engine['calculateCustomScore'](metrics, engine.getProfile(), 80);
        console.log(`${v.license_plate}: ${v.distance.toFixed(1)} km | Score: ${s.toFixed(2)}`);
        
        totalD += v.distance;
        weightedScore += (s * v.distance);
    }

    console.log("\n=== TOTALS ===");
    console.log(`Aggregated average (Sum(Score*Dist)/Sum(Dist)): ${(weightedScore / totalD).toFixed(2)}`);

    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
