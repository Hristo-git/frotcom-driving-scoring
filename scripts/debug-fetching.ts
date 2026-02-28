import { ScoringEngine, DEFAULT_WEIGHTS } from '../lib/scoring';
import 'dotenv/config';

async function test() {
    const engine = new ScoringEngine();
    const now = new Date();
    const firstDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const startStr = firstDay.toISOString();
    const lastDay = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
    const endStr = lastDay.toISOString();

    console.log(`Testing range: ${startStr} to ${endStr}`);

    try {
        const drivers = await engine.getDriverPerformance(startStr, endStr, { weights: DEFAULT_WEIGHTS });
        console.log(`Found ${drivers.length} drivers`);
        if (drivers.length > 0) {
            console.log('Sample driver:', drivers[0].driverName, 'Score:', drivers[0].score);
        }

        const countries = await engine.getCountryPerformance(startStr, endStr, { weights: DEFAULT_WEIGHTS });
        console.log(`Found ${countries.length} countries`);

        const warehouses = await engine.getWarehousePerformance(startStr, endStr, DEFAULT_WEIGHTS);
        console.log(`Found ${warehouses.length} warehouses`);

        const vehicles = await engine.getVehiclePerformance(startStr, endStr, { weights: DEFAULT_WEIGHTS });
        console.log(`Found ${vehicles.length} vehicles`);

    } catch (err) {
        console.error('Error during test:', err);
    }
}

test();
