const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.crmSettings.findMany({
        where: { welcomeMessageText: { not: null } },
        select: { businessId: true, campaignType: true, welcomeMessageText: true, btnAllowText: true, botMode: true }
    });
    console.log(JSON.stringify(settings, null, 2));
}

main().finally(() => prisma.$disconnect());
