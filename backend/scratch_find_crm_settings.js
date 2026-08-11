const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const s = await prisma.crmSettings.findMany({ where: { businessId: 1 } });
    console.log("CRM Settings for Business 1:");
    s.forEach(x => {
        console.log(`Campaign: ${x.campaignType}, waNumId: ${x.waNumId}`);
    });
}
main().finally(() => prisma.$disconnect());
