const axios = require('axios');

async function testMatch() {
    try {
        console.log("Setting active bank to Commercial...");
        await axios.post('http://localhost:5001/api/v1/ai-verification/settings-active', {
            activeBank: 'Commercial',
            activeSlips: ['CDM Slip']
        });

        console.log("Calling verify-single...");
        // Payment ID 2388 might be a sample. Let's see what happens.
        // But if we want to reproduce the user's exact issue, we can just look at the logs of verify-single!
        
        // Wait, why don't we just mock the payload of verify-single?
        const res = await axios.post('http://localhost:5001/api/v1/ai-verification/verify-single', {
            paymentId: 2388,
            statementMonth: 'July 2026'
        });
        
        console.log("Response:", res.data);
    } catch(err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}
testMatch();
