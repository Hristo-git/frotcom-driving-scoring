
import * as https from 'https';

async function extractDriverEcodrivingSchema() {
    return new Promise((resolve, reject) => {
        https.get('https://v2api.frotcom.com/swagger/docs/v2', (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
                try {
                    const swagger = JSON.parse(data);
                    const driverEco = swagger.paths['/v2/ecodriving/driver'];
                    console.log("GET /v2/ecodriving/driver schema:");
                    console.log(JSON.stringify(driverEco, null, 2));

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
extractDriverEcodrivingSchema();
