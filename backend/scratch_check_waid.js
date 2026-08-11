const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const s = await prisma.crmSettings.findMany({ select: { waId: true, waNumId: true, campaignType: true } });
    console.log(s);
}
main().finally(() => prisma.$disconnect());
