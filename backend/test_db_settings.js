const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const settingsList = await prisma.crmSettings.findMany({
        where: { campaignType: 'AFTER_SEMINAR' }
    });
    for (const settings of settingsList) {
        console.log(`Biz ${settings.businessId} | waNumId: ${settings.waNumId} | waId: ${settings.waId}`);
    }
}
run();
