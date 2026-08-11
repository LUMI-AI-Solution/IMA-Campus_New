const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

async function setCallingConfig() {
    try {
        const waAccount = await prisma.whatsappAccount.findFirst();
        if (!waAccount) {
            console.log("No WhatsApp Account found in DB");
            return;
        }
        
        console.log(`Updating calling config for Phone ID: ${waAccount.phoneId}`);
        const response = await axios.post(
            `https://graph.facebook.com/v20.0/${waAccount.phoneId}`,
            {
                // Fields to update the calling config to Webhooks
                // Meta docs state you need to set platform_type to WEBHOOK
                platform_type: "WEBHOOK"
            },
            {
                headers: {
                    Authorization: `Bearer ${waAccount.accessToken}`
                }
            }
        );
        console.log("Success:", response.data);
    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}
setCallingConfig();
