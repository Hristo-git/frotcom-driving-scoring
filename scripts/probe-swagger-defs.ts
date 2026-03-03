
import * as https from 'https';

async function extractDefinitions() {
    return new Promise((resolve, reject) => {
        https.get('https://v2api.frotcom.com/swagger/docs/v2', (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
                try {
                    const swagger = JSON.parse(data);
                    const defs = swagger.definitions;

                    console.log("--- Filter Definition ---");
                    console.log(JSON.stringify(defs['Frotcom.DataModels.Ecodriving.Filter'], null, 2));

                    console.log("\n--- ScoreItem Definition ---");
                    console.log(JSON.stringify(defs['Frotcom.Api.Models.Ecodriving.ScoreItem'], null, 2));

                    if (swagger.paths['/v2/vehicles/{vehicleId}/mileageandtime']) {
                        console.log("\n--- mileageandtime Path ---");
                        console.log(JSON.stringify(swagger.paths['/v2/vehicles/{vehicleId}/mileageandtime'], null, 2));
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
extractDefinitions();
