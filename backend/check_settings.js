const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSettings() {
    try {
        const settings = await prisma.crmSettings.findFirst({
            where: { businessId: 6, campaignType: 'AFTER_SEMINAR' }
        });
        console.log("Settings BIZ 6:", JSON.stringify(settings, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkSettings();
