import pool from '../lib/db';

// Keyword → country name mapping (checked against actual country names in DB)
// Order matters: more specific patterns first
const COUNTRY_KEYWORDS: { pattern: RegExp; country: string }[] = [
    { pattern: /Ямбол\s*Щафет/i,     country: 'Ямбол Щафетни' },
    { pattern: /Щафет/i,             country: 'Ямбол Щафетни' },
    { pattern: /Ямбол/i,             country: 'Ямбол' },
    { pattern: /Столник/i,           country: 'Столник' },
    { pattern: /Петрич/i,            country: 'Петрич' },
    { pattern: /Пловдив/i,           country: 'Пловдив' },
    { pattern: /Плевен/i,            country: 'Плевен' },
    { pattern: /Русе/i,              country: 'Русе' },
    { pattern: /Варна/i,             country: 'Варна' },
    { pattern: /Видин/i,             country: 'Видин' },
    { pattern: /Skopje|Скопие/i,     country: 'Skopje' },
    { pattern: /Bucharest/i,         country: 'Bucharest' },
    { pattern: /Chi[sș]in[aă]u/i,   country: 'Chișinău' },
    { pattern: /Moldova/i,           country: 'Moldova' },
    { pattern: /Автотранспорт/i,     country: 'Столник' },
    { pattern: /Механик/i,           country: 'Столник' },
];

async function main() {
    // Load existing countries
    const cRes = await pool.query('SELECT id, name FROM countries');
    const countryMap = new Map<string, number>(cRes.rows.map((r: any) => [r.name, r.id]));
    console.log('Known countries:', [...countryMap.keys()]);

    // Get unassigned drivers
    const dRes = await pool.query(`
        SELECT id, name FROM drivers
        WHERE country_id IS NULL
        ORDER BY name
    `);
    console.log(`\nUnassigned drivers: ${dRes.rows.length}`);

    let updated = 0;
    let skipped = 0;

    for (const driver of dRes.rows) {
        // Find matching country
        let matched: string | null = null;
        for (const { pattern, country } of COUNTRY_KEYWORDS) {
            if (pattern.test(driver.name)) {
                matched = country;
                break;
            }
        }

        if (!matched) {
            skipped++;
            continue;
        }

        const countryId = countryMap.get(matched);
        if (!countryId) {
            // Country doesn't exist yet — create it
            const ins = await pool.query(
                `INSERT INTO countries (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
                [matched]
            );
            countryMap.set(matched, ins.rows[0].id);
        }

        await pool.query(
            'UPDATE drivers SET country_id = $1 WHERE id = $2',
            [countryMap.get(matched), driver.id]
        );
        console.log(`  ✓ ${driver.name.padEnd(50)} → ${matched}`);
        updated++;
    }

    console.log(`\nUpdated: ${updated}, Skipped (no match): ${skipped}`);

    // Show remaining unassigned active drivers
    const remaining = await pool.query(`
        SELECT d.name
        FROM ecodriving_scores es
        JOIN drivers d ON es.driver_id = d.id
        WHERE es.period_start::date = '2026-03-01'
          AND es.period_end::date = '2026-03-27'
          AND (es.metrics->>'isPeriodSummary')::boolean = true
          AND d.country_id IS NULL
        ORDER BY d.name
    `);
    console.log(`\nStill unassigned active drivers (${remaining.rows.length}):`);
    for (const r of remaining.rows) console.log(`  ${r.name}`);

    await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
