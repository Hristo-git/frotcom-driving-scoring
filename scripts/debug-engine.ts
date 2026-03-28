import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';

async function debug() {
    const engine = new ScoringEngine();
    const from = '2026-03-01T00:00:00';
    const to = '2026-03-25T23:59:59';

    const drivers = [
        { name: 'Костадин Ангелов Аклашев', target: 7.89 },
        { name: 'Петър Стоянов Митов', target: 7.38 },
        { name: 'Вангел Методиев Китанов', target: 4.06 }
    ];

    console.log('--- ENGINE DIAGNOSTIC ---');
    console.log('Period:', from, 'to', to);

    for (const d of drivers) {
        // Find driver ID
        const drRes = await pool.query("SELECT id FROM drivers WHERE name LIKE $1", [`%${d.name.split(' ')[0]}%`]);
        if (drRes.rows.length > 0) {
            const id = drRes.rows[0].id;
            const perf = await engine.getDriverPerformance(id, from, to);
            console.log(`\nDriver: ${d.name}`);
            console.log(`KM: ${perf.totalDistance}`);
            console.log(`Idle%: ${perf.metrics.excessiveIdling}`);
            console.log(`Events:`, JSON.stringify(perf.events, null, 2));
            console.log(`Current App Score: ${perf.customScore.toFixed(2)} (Target: ${d.target})`);
        }
    }
    await pool.end();
}

debug().catch(console.error);
