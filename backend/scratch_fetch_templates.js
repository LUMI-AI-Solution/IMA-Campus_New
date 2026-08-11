const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const settingsList = await prisma.crmSettings.findMany();
  for (const settings of settingsList) {
    if (!settings.waId || !settings.metaApiKey) continue;
    try {
      const res = await axios.get(`https://graph.facebook.com/v19.0/${settings.waId}/message_templates`, {
        headers: { Authorization: `Bearer ${settings.metaApiKey}` }
      });
      const templates = res.data.data;
      const callRequests = templates.filter(t => t.name.startsWith('call_request') && t.status === 'APPROVED');
      console.log(`Business ${settings.businessId} | waId ${settings.waId} | Found ${callRequests.length} call templates: ${callRequests.map(t=>t.name).join(', ')}`);
    } catch (err) {
      console.error(`Business ${settings.businessId} Error:`, err.response?.data?.error?.message || err.message);
    }
  }
}
run().finally(() => prisma.$disconnect());
