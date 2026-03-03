// native fetch

async function findSwagger() {
    try {
        const res = await fetch('https://v2api.frotcom.com/documentation/index.html');
        const text = await res.text();

        // Find URLs ending in .json or matching swagger
        const matches = text.match(/https?:\/\/[^"']+\.json/g) || text.match(/"([^"]*swagger[^"]*)"/g);
        console.log("Potential swagger URLs:");
        console.log(matches);

        // If not found, let's try some common ones
        const urls = [
            'https://v2api.frotcom.com/swagger/docs/v2',
            'https://v2api.frotcom.com/swagger/v2/swagger.json',
            'https://v2api.frotcom.com/api-docs'
        ];
        for (const u of urls) {
            const r = await fetch(u);
            if (r.ok) {
                console.log("Found valid schema at: " + u);
                break;
            }
        }
    } catch (e) {
        console.error(e);
    }
}
findSwagger();
