import { FrotcomClient } from '../lib/frotcom';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkPeriodParam() {
    try {
        console.log(`Checking if adding period: 'custom' or timeframe: 'custom' to the payload forces Frotcom to parse the dates...`);

        const dates = [
            { name: 'Feb 14', start: '2026-02-14T00:00:00', end: '2026-02-14T23:59:59' },
            { name: 'Jan 1', start: '2026-01-01T00:00:00', end: '2026-01-01T23:59:59' }
        ];

        const payloadVariations = [
            { desc: 'period: custom', extra: { period: 'custom' } },
            { desc: 'period: custom, no timezone', extra: { period: 'custom', timezone: 'UTC' } },
            { desc: 'timeframe: custom', extra: { timeframe: 'custom' } },
            { desc: 'custom: true', extra: { custom: true } }
        ];

        for (const variation of payloadVariations) {
            console.log(`\n\n--- Testing ${variation.desc} ---`);
            for (const date of dates) {
                const body = {
                    ...variation.extra,
                    from_datetime: date.start,
                    to_datetime: date.end,
                    driverIds: [308019],
                    groupBy: 'driver'
                };

                let data = await FrotcomClient.request<any[]>('v2/ecodriving/calculate', 'POST', body);

                let mileage = data && data.length > 0 ? data[0].mileage : 'NO DATA';
                console.log(`[${date.name}] Zhivko Mileage: ${mileage} km`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkPeriodParam();
