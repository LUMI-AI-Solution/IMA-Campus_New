const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const b = await prisma.business.findFirst({ where: { name: 'මාස 06න් A/L - Art' } });
    if (b) {
        const s = await prisma.crmSettings.findFirst({ where: { businessId: b.id } });
        console.log("waNumId in DB for this business:", s ? s.waNumId : 'No settings');
    } else {
        console.log("Business not found");
    }
}
main().finally(() => prisma.$disconnect());
