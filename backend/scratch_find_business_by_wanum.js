const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const s = await prisma.crmSettings.findMany({ 
        where: { waNumId: '1266389426549974' },
        include: { businesses: true }
    });
    console.log("Businesses with waNumId 1266389426549974:", JSON.stringify(s, null, 2));
}
main().finally(() => prisma.$disconnect());
