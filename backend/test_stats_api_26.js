const axios = require('axios');

async function test() {
    try {
        const res = await axios.get(`http://localhost:5000/api/coordinator-crm/campaign-stats?batchId=26&startDate=2020-01-01&endDate=2030-01-01`);
        const thisuriStats = res.data.report.find(r => r.agentName.includes('Thisuri'));
        console.log("Thisuri stats with July batch (26):", thisuriStats);
    } catch(e) { console.error(e.response ? e.response.data : e.message); }
}
test();
