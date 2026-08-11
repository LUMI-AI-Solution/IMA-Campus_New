const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const settingsList = await prisma.crmSettings.findMany();
    console.log(`Found ${settingsList.length} settings records.`);
    settingsList.forEach(s => console.log(s.id, s.campaignType, "waId:", s.waId ? "Yes" : "No", "metaApiKey:", s.metaApiKey ? "Yes" : "No"));
}
run();
