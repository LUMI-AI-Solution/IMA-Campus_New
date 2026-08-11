const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const settings = await prisma.crmSettings.findFirst({ where: { businessId: 14, campaignType: 'AFTER_SEMINAR' } });
  try {
    const res = await axios.get(`https://graph.facebook.com/v19.0/1435924168573355/subscribed_apps`, {
      headers: { 'Authorization': `Bearer ${settings.metaApiKey}` }
    });
    console.log("Subscribed Apps:", JSON.stringify(res.data, null, 2));
  } catch (error) {
    console.log("Error:", error.response?.data);
  }
}
run();
