
import * as https from 'https';

async function extractTripsSchema() {
    return new Promise((resolve, reject) => {
        https.get('https://v2api.frotcom.com/swagger/docs/v2', (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
                try {
                    const swagger = JSON.parse(data);
                    const trips = swagger.paths['/v2/vehicles/{id}/trips'];
                    console.log("GET /v2/vehicles/{id}/trips schema:");
                    console.log(JSON.stringify(trips, null, 2));

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
extractTripsSchema();
