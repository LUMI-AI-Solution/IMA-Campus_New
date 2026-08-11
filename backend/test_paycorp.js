require('dotenv').config({path: '/root/IMA-Campus/backend/.env'});
const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

async function testPaycorp() {
    try {
        const payload = {
            version: "1.5",
            msgId: uuidv4().toUpperCase(),
            operation: "PAYMENT_INIT",
            requestDate: new Date().toISOString(),
            validateOnly: false,
            requestData: {
                clientId: process.env.PAYCORP_CLIENT_ID || "14008195",
                clientIdHash: "",
                transactionType: "PURCHASE",
                transactionAmount: {
                    totalAmount: 0,
                    paymentAmount: 10000,
                    serviceFeeAmount: 0,
                    currency: "LKR"
                },
                redirect: {
                    returnUrl: "http://localhost:5173/student/paycorp-return",
                    cancelUrl: "",
                    returnMethod: "GET"
                },
                clientRef: "TEST-12345",
                comment: "IMA Campus Payment Test",
                tokenize: false,
                cssLocation1: "",
                cssLocation2: "",
                useReliability: true
            }
        };

        const payloadString = JSON.stringify(payload);
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
