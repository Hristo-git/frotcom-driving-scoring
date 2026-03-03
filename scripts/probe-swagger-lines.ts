
import * as https from 'https';

async function findLines() {
    return new Promise((resolve, reject) => {
        https.get('https://v2api.frotcom.com/swagger/docs/v2', (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
                try {
                    const swagger = JSON.parse(data);
                    const paths = Object.keys(swagger.paths);
                    const linePaths = paths.filter(p => p.toLowerCase().includes('lines'));
                    console.log("Paths with 'lines':", linePaths);

                    // Also search in summaries/descriptions
                    for (const p of paths) {
                        const methods = ['get', 'post', 'put', 'delete'];
                        for (const m of methods) {
                            if (swagger.paths[p][m]) {
                                const desc = (swagger.paths[p][m].description || '').toLowerCase();
                                const summary = (swagger.paths[p][m].summary || '').toLowerCase();
                                if (desc.includes('lines') || summary.includes('lines')) {
                                    console.log(`Match in ${m.toUpperCase()} ${p}: Summary="${swagger.paths[p][m].summary}"`);
                                }
                            }
                        }
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
findLines();
