const axios = require('axios');
async function run() {
    try {
        const res = await axios.get('http://localhost:5000/coordinator-crm/campaign-stats', {
            params: { phase: 'All' },
            // Need a valid token, or just mock the logic. Since we just want to see logic, maybe it's better to run the logic directly with Prisma.
        });
        console.log(res.data);
    } catch(e) { console.error(e.response?.data || e.message); }
}
run();
