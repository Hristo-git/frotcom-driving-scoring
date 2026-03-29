
import { FrotcomClient, FrotcomDriver } from './frotcom';
import pool from './db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function sanitize(str: string | undefined): string {
    if (!str) return '';
    // Postgres doesn't like null bytes
    return str.replace(/\u0000/g, '').trim();
}

// Keywords in driver names → country name fallback when Frotcom has no segment set
const NAME_COUNTRY_KEYWORDS: { pattern: RegExp; country: string }[] = [
    { pattern: /Ямбол\s*Щафет|Щафет/i,  country: 'Ямбол Щафетни' },
    { pattern: /Ямбол/i,                 country: 'Ямбол' },
    { pattern: /Столник|Механик/i,       country: 'Столник' },
    { pattern: /Петрич/i,                country: 'Петрич' },
    { pattern: /Пловдив/i,               country: 'Пловдив' },
    { pattern: /Плевен/i,                country: 'Плевен' },
    { pattern: /Русе/i,                  country: 'Русе' },
    { pattern: /Варна/i,                 country: 'Варна' },
    { pattern: /Видин/i,                 country: 'Видин' },
    { pattern: /Skopje|Скопие/i,         country: 'Skopje' },
    { pattern: /Bucharest/i,             country: 'Bucharest' },
    { pattern: /Chi[sș]in[aă]u/i,       country: 'Chișinău' },
    { pattern: /Moldova/i,               country: 'Moldova' },
    { pattern: /Автотранспорт/i,         country: 'Столник' },
];

async function inferCountryFromName(name: string, countriesMap: Map<string, number>): Promise<number | null> {
    for (const { pattern, country } of NAME_COUNTRY_KEYWORDS) {
        if (pattern.test(name)) {
            let id = countriesMap.get(country);
            if (!id) {
                const res = await pool.query(
                    `INSERT INTO countries (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
                    [country]
                );
                id = res.rows[0].id as number;
                countriesMap.set(country, id);
            }
            return id!;
        }
    }
    return null;
}

export async function syncDriversAndVehicles() {
    console.log('Starting synchronization...');

    try {
        console.log('Database pool ready.');

        console.log('Fetching drivers from Frotcom...');
        const drivers = await FrotcomClient.getDrivers();
        console.log(`Fetched ${drivers.length} drivers.`);

        console.log('Fetching vehicles from Frotcom...');
        const vehicles = await FrotcomClient.getVehicles();
        console.log(`Fetched ${vehicles.length} vehicles.`);

        const countriesMap = new Map<string, number>();
        const warehousesMap = new Map<string, number>();

        for (const driver of drivers) {
            // Sync Country (Segment)
            if (driver.segment && driver.segmentId) {
                const countryRes = await pool.query(
                    `INSERT INTO countries (name, frotcom_id) VALUES ($1, $2) 
                     ON CONFLICT (name) DO UPDATE SET frotcom_id = EXCLUDED.frotcom_id 
                     RETURNING id`,
                    [sanitize(driver.segment), driver.segmentId.toString()]
                );
                countriesMap.set(driver.segment, countryRes.rows[0].id);
            }

            // Sync Warehouse (Department)
            if (driver.department && driver.departmentId) {
                const warehouseRes = await pool.query(
                    `INSERT INTO warehouses (name, frotcom_id) VALUES ($1, $2) 
                     ON CONFLICT (name) DO UPDATE SET frotcom_id = EXCLUDED.frotcom_id 
                     RETURNING id`,
                    [sanitize(driver.department), driver.departmentId.toString()]
                );
                warehousesMap.set(driver.department, warehouseRes.rows[0].id);
            }

            const frotcomCountryId = driver.segment ? countriesMap.get(driver.segment) : null;
            const warehouseId = driver.department ? warehousesMap.get(driver.department) : null;
            // If Frotcom has no segment, infer country from driver name
            const countryId = frotcomCountryId ?? await inferCountryFromName(sanitize(driver.name), countriesMap);

            // Sync Driver — only update country_id when we have one (don't overwrite with NULL)
            await pool.query(
                `INSERT INTO drivers (name, frotcom_id, country_id, warehouse_id, metadata)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (frotcom_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    country_id = COALESCE(EXCLUDED.country_id, drivers.country_id),
                    warehouse_id = COALESCE(EXCLUDED.warehouse_id, drivers.warehouse_id),
                    metadata = EXCLUDED.metadata`,
                [
                    sanitize(driver.name),
                    driver.id.toString(),
                    countryId,
                    warehouseId,
                    JSON.stringify(driver).replace(/\\u0000/g, '') // Sanitize JSON too
                ]
            );
        }

        for (const vehicle of vehicles) {
            await pool.query(
                `INSERT INTO vehicles (frotcom_id, license_plate, metadata) 
                 VALUES ($1, $2, $3)
                 ON CONFLICT (frotcom_id) DO UPDATE SET 
                    license_plate = EXCLUDED.license_plate,
                    metadata = EXCLUDED.metadata,
                    updated_at = NOW()`,
                [
                    vehicle.id.toString(),
                    sanitize(vehicle.licensePlate),
                    JSON.stringify(vehicle).replace(/\\u0000/g, '')
                ]
            );
        }

        console.log('Metadata synchronization complete.');

    } catch (error) {
        console.error('Error during synchronization:', error);
    }
}
