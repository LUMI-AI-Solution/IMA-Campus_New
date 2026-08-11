const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const settings = await prisma.crmSettings.findFirst({ where: { businessId: 14, campaignType: 'AFTER_SEMINAR' } });
  if (!settings) return console.log("Settings not found");
  
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "94712209030",
    type: "text",
    text: { body: "Postman Test Message" }
  };
  
  try {
    const res = await axios.post(`https://graph.facebook.com/v19.0/${settings.waNumId}/messages`, payload, {
      headers: {
        'Authorization': `Bearer ${settings.metaApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("Success! Response:", res.data);
  } catch (error) {
    console.log("Error Status:", error.response?.status);
    console.log("Error Data:", JSON.stringify(error.response?.data, null, 2));
  }
}
run();
