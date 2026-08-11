const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const settings = await prisma.crmSettings.findFirst({
        where: { businessId: 17, campaignType: 'AFTER_SEMINAR' }
    });
    console.log(settings);
}
main();
