const { getCampaignStats } = require('./controllers/freeSeminarController');

async function main() {
    const req = {
        query: {
            businessId: "6",
            batchId: "39",
            phase: "All",
            startDate: "2020-01-01T00:00:00.000Z",
            endDate: "2030-01-01T00:00:00.000Z"
        }
    };
    const res = {
        status: function(s) {
            console.log("Status:", s);
            return this;
        },
        json: function(d) {
            console.log("JSON Output Keys:", Object.keys(d));
            return this;
        }
    };
    
    try {
        await getCampaignStats(req, res);
    } catch(e) {
        console.error("Caught Error:", e);
    }
}
main();
