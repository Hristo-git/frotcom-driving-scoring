
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function vehicleBreakdown() {
    try {
        const driverId = 342;
        const start = '2026-03-01';
        const end = '2026-03-15';
        
        const res = await pool.query(
            `SELECT metrics FROM ecodriving_scores 
             WHERE driver_id = $1 AND period_start >= $2 AND period_end <= $3`,
            [driverId, start, end]
        );
        
        let vehicles: Record<string, any> = {};
        
        for (const row of res.rows) {
            const m = row.metrics || {};
            const ec = m.eventCounts || {};
            const dist = parseFloat(m.mileage) || 0;
            const vId = m.vehicleId || 'unknown';
            
            if (!vehicles[vId]) {
                vehicles[vId] = {
                    dist: 0,
                    accel: 0,
                    brake: 0,
                    corner: 0,
                    shift: 0,
                    idle: 0,
                    rpm: 0
                };
            }
            
            vehicles[vId].dist += dist;
            vehicles[vId].accel += (nf(ec.lowSpeedAcceleration) + nf(ec.highSpeedAcceleration));
            vehicles[vId].brake += (nf(ec.lowSpeedBreak) + nf(ec.highSpeedBreak));
            vehicles[vId].corner += nf(ec.lateralAcceleration);
            vehicles[vId].shift += nf(ec.accelBrakeFastShift);
            vehicles[vId].idle += nf(m.idleTimeMinutes); // Assuming we have this
            vehicles[vId].rpm += nf(ec.highRPM);
        }
        
        function nf(v: any) { return parseFloat(v) || 0; }
        
        for (const vId in vehicles) {
            const v = vehicles[vId];
            const ratio = v.dist / 100;
            if (ratio > 0) {
                console.log(`\nVehicle: ${vId} | Dist: ${v.dist.toFixed(1)} km`);
                console.log(`Accel Rate: ${(v.accel / ratio).toFixed(2)}`);
                console.log(`Brake Rate: ${(v.brake / ratio).toFixed(2)}`);
                console.log(`Corner Rate: ${(v.corner / ratio).toFixed(2)}`);
                console.log(`Shift Rate: ${(v.shift / ratio).toFixed(2)}`);
            }
        }
        
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

vehicleBreakdown();
