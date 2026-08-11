const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

async function setCallingConfig() {
    try {
        const crmSetting = await prisma.crmSettings.findFirst({
            where: { metaApiKey: { not: null }, waNumId: { not: null } }
        });
        if (!crmSetting) {
            console.log("No CRM Setting with WhatsApp API found in DB");
            return;
        }
        
        console.log(`Updating calling config for Phone ID: ${crmSetting.waNumId}`);
        const response = await axios.post(
            `https://graph.facebook.com/v20.0/${crmSetting.waNumId}`,
            {
                platform_type: "WEBHOOK"
            },
            {
                headers: {
                    Authorization: `Bearer ${crmSetting.metaApiKey}`
                }
            }
        );
        console.log("Success:", response.data);
    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}
setCallingConfig();
