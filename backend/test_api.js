const axios = require('axios');

async function test() {
    try {
        const res = await axios.post('http://localhost:5000/api/after-seminar-crm/leads/send-call-request', { leadId: 57242 }); // random lead
        console.log("Status:", res.status);
    } catch (error) {
        console.log("Error status:", error.response?.status);
        console.log("Error data:", error.response?.data);
    }
}
test();
