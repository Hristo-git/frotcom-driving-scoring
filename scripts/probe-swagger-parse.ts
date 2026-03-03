
import * as fs from 'fs';
import * as https from 'https';

async function parseSwagger() {
    console.log("Downloading swagger.json...");

    return new Promise((resolve, reject) => {
        https.get('https://v2api.frotcom.com/swagger/docs/v2', (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
                try {
                    const swagger = JSON.parse(data);
                    const paths = Object.keys(swagger.paths || {});
                    console.log(`Found ${paths.length} total endpoints`);

                    const keywords = ['score', 'team', 'driver', 'trip', 'co-', 'calculate'];

                    for (const kw of keywords) {
                        const matched = paths.filter(p => p.toLowerCase().includes(kw));
                        console.log(`\n--- Matches for '${kw}': ---`);
                        matched.forEach(p => console.log('  ' + p));
                    }

                    resolve(true);
                } catch (e) {
                    console.error("Error parsing JSON");
                }
            });
        }).on("error", (err) => {
            console.log("Error: " + err.message);
        });
    });
}
parseSwagger();
