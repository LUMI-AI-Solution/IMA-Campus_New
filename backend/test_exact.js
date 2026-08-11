require('dotenv').config({path: '/root/IMA-Campus/backend/.env'});
const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

async function testPaycorp() {
    try {
        const payloadString = '{"version":"1.5","msgId":"99B3CE3D-AF66-410F-BD88-33DE9FACDDF2","operation":"PAYMENT_INIT","requestDate":"2026-07-23T16:13:29.096Z","validateOnly":false,"requestData":{"clientId":"14008195","clientIdHash":"","transactionType":"PURCHASE","transactionAmount":{"totalAmount":0,"paymentAmount":2000,"serviceFeeAmount":0,"currency":"LKR"},"redirect":{"returnUrl":"https://imacampus.online/student/paycorp-return?businessId=7","cancelUrl":"","returnMethod":"GET"},"clientRef":"ORD-1784823202294","comment":"IMA Campus Payment","tokenize":false,"cssLocation1":"","cssLocation2":"","useReliability":true}}';
        const payload = JSON.parse(payloadString);

        const hmac = crypto.createHmac('sha256', process.env.PAYCORP_HMAC_SECRET)
                           .update(payloadString)
                           .digest('hex');

        const headers = {
            'Content-Type': 'application/json',
            'AUTHTOKEN': process.env.PAYCORP_AUTH_TOKEN,
            'HMAC': hmac
        };

        console.log("Sending request to:", process.env.PAYCORP_ENDPOINT);
        const response = await axios.post(process.env.PAYCORP_ENDPOINT, payload, { headers });
        console.log("Response:", response.data);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testPaycorp();
