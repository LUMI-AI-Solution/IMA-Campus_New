const axios = require('axios');

async function test() {
    try {
        console.log("Triggering verification for payment 2955...");
        const res = await axios.post('http://localhost:5000/api/ai/verify', {
            paymentId: 2955,
            autoVerify: true,
            autoDetect: true
        });
        console.log(res.data);
    } catch(e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
test();
