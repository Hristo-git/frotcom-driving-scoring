
import { FrotcomClient } from '../lib/frotcom';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    const start = '2026-02-01';
    const end = '2026-02-28';

    console.log(`Querying Frotcom API for month aggregate: ${start} to ${end}`);

    try {
        const results = await FrotcomClient.calculateEcodriving(start, end);

        const targets = [
            'Марјан Трајковски - Скопие',
            'Марјан Стефановски - Скопие',
            'Бобан Андреевски - Скопие',
            'Горан Димишковска - Скопие',
            'Злате Вујовски - Скопие',
            'Игор Блажевски - Скопие',
            'Александар Стефановски - Скопие'
        ];

        console.log("\nFILTERED API RESULTS:");
        results.forEach((r: any) => {
            if (targets.includes(r.driverName)) {
                console.log(`\nDriver: ${r.driverName} (ID: ${r.driverId})`);
                console.log(`Score: ${r.score}`);
                console.log(`Mileage: ${r.mileage} km`);
            }
        });

    } catch (err) {
        console.error(err);
    }
}

main();
