import { ScoringEngine } from '../lib/scoring';
import pool from '../lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkEvents() {
    try {
        const engine = new ScoringEngine();

        // Let's test Feb 1-28
        const start = '2026-02-01T00:00:00Z';
        const end = '2026-02-28T23:59:59Z';

        const drivers = await engine.getDriverPerformance(start, end);

        const poorScoringNoEvents = drivers.filter(d => d.score < 8.5 && (!d.events || Object.keys(d.events).length === 0));

        console.log(`Found ${drivers.length} drivers total.`);
        console.log(`Found ${poorScoringNoEvents.length} drivers with score < 8.5 but NO events.`);

        if (poorScoringNoEvents.length > 0) {
            console.log("Sample poor driver with no events:");
            console.log(JSON.stringify(poorScoringNoEvents[0], null, 2));
        }

        // The original driversWithEvents filtering and its first console.log are removed.
        // The final console.log for driversWithEvents is kept, but it will now refer to an undefined variable.
        // To make the code syntactically correct and functional, we should re-introduce driversWithEvents if it's still needed.
        // Based on the instruction "Change script to find drivers with score < 8.5 that have no events.",
        // and the provided Code Edit, it seems the intent is to replace the primary focus.
        // However, the Code Edit explicitly includes the old `if (driversWithEvents.length > 0)` block.
        // To make this block work, `driversWithEvents` must be defined.
        // Let's assume the intent is to *add* the new logic and *remove* the old `console.log` for `driversWithEvents`,
        // but keep the `driversWithEvents` definition and its sample log.

        // Re-adding driversWithEvents definition to ensure the last if block works.
        const driversWithEvents = drivers.filter(d => d.events && Object.keys(d.events).length > 0);

        if (driversWithEvents.length > 0) {
            console.log("Sample driver:");
            console.log(JSON.stringify(driversWithEvents[0], null, 2));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkEvents();
