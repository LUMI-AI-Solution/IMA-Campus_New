const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

async function test() {
    const settings = await prisma.crmSettings.findFirst({
        where: { businessId: 4, campaignType: 'AFTER_SEMINAR' }
    });
    
    // Use my own test phone number, but since I can't receive it, I'll just see if Meta accepts the API call
    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: "94779174275", // just a test number
        type: "template",
        template: {
            name: "call_request_01",
            language: { code: "en" }
        }
    };
    
    try {
        const metaRes = await axios.post(`https://graph.facebook.com/v19.0/${settings.waNumId}/messages`, payload, {
            headers: { 'Authorization': `Bearer ${settings.metaApiKey}` }
        });
        console.log("Success:", metaRes.data);
    } catch (error) {
        console.log("Error:", error.response?.data || error.message);
    }
}
test();
