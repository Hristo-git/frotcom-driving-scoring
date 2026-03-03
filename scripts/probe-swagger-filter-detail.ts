
import * as https from 'https';

async function extractDetailedFilter() {
    return new Promise((resolve, reject) => {
        https.get('https://v2api.frotcom.com/swagger/docs/v2', (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
                try {
                    const swagger = JSON.parse(data);
                    const filter = swagger.definitions['Frotcom.DataModels.Ecodriving.Filter'];
                    console.log("Frotcom.DataModels.Ecodriving.Filter definition:");
                    console.log(JSON.stringify(filter, null, 2));

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
extractDetailedFilter();
