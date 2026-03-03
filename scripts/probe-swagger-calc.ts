
import * as https from 'https';

async function extractCalculateSchema() {
    return new Promise((resolve, reject) => {
        https.get('https://v2api.frotcom.com/swagger/docs/v2', (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
                try {
                    const swagger = JSON.parse(data);
                    const calc = swagger.paths['/v2/ecodriving/calculate'];
                    console.log("POST /v2/ecodriving/calculate schema:");
                    console.log(JSON.stringify(calc, null, 2));

                    // Also check for any 'reports' or 'mileage' in the whole file
                    const paths = Object.keys(swagger.paths);
                    const mileagePaths = paths.filter(p => p.toLowerCase().includes('mileage'));
                    console.log("\nMileage related paths:");
                    console.log(mileagePaths);

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
extractCalculateSchema();
