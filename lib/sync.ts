
import { FrotcomClient, FrotcomDriver, FrotcomVehicleDetails } from './frotcom';
import { Client } from 'pg';

// Database client configuration would ideally be imported from a db module to reuse connection
// For now, I'll instantiate a new client here or assume a global pool.
// Better practice: create a lib/db.ts

export async function syncDriversAndVehicles() {
    const db = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    await db.connect();
    try {
        console.log('Fetching vehicles from Frotcom...');
        const vehicles = await FrotcomClient.getVehicles();
        console.log(`Found ${vehicles.length} vehicles.`);

        for (const vehicle of vehicles) {
            console.log(`Processing vehicle ${vehicle.license_plate} (${vehicle.id})...`);

            // Fetch details to get Department (Warehouse) and Segment (Country)
            const details = await FrotcomClient.getVehicleDetails(vehicle.id);

            // Upsert Country (Segment)
            let countryId = null;
            if (details.segment) {
                const countryRes = await db.query(
                    `INSERT INTO countries (name) VALUES ($1) 
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
           RETURNING id`,
                    [details.segment]
                );
                countryId = countryRes.rows[0].id;
            }

            // Upsert Warehouse (Department)
            let warehouseId = null;
            if (details.department) {
                const warehouseRes = await db.query(
                    `INSERT INTO warehouses (name) VALUES ($1) 
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
           RETURNING id`,
                    [details.department]
                );
                warehouseId = warehouseRes.rows[0].id;
            }

            // We need to link this vehicle to a "driver" concept.
            // In Frotcom, vehicles and drivers are distinct. 
            // If the goal is "Driver Behavior", we strictly need Drivers.
            // If the user said "Get vehicle details" gives department/segment, 
            // maybe the driver is assigned to the vehicle?
            // Frotcom has "Associated Driver". Let's check if details has it.
            // For now, I'll store the VEHICLE as the main entity if no driver info is present,
            // OR I should fetch All Drivers and try to link them?
            // The user's prompt implies we are scoring DRIVERS by Country/Warehouse.
            // Country/Warehouse comes from the VEHICLE (Department/Segment).
            // So we need: Driver -> Period -> Vehicle (driven) -> Warehouse/Country.

            // Step 1: Just ensure the Vehicle exists in DB with its metadata.
            // We might need a separate table for "Objects" or generic "Assets" if "drivers" table is strictly for humans.
            // For now, assuming we just sync metadata.

            // Let's look for a Driver field in Vehicle Details?
            // If not, we rely on Ecodriving API to give us the driver data.

            // But we need to filter proper valid drivers.
            // Let's try to fetch Drivers list too.
        }

        // Fetch Drivers
        const drivers = await FrotcomClient.getDrivers();
        console.log(`Found ${drivers.length} drivers.`);

        for (const driver of drivers) {
            await db.query(
                `INSERT INTO drivers (name, frotcom_id, external_id) 
           VALUES ($1, $2, $3)
           ON CONFLICT (frotcom_id) DO NOTHING`,
                [driver.name, driver.id, driver.employee_no]
            );
        }

    } catch (error) {
        console.error('Error syncing metadata:', error);
    } finally {
        await db.end();
    }
}
