const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCrmSettings() {
    const settings = await prisma.crmSettings.findMany({
        where: {
            OR: [
                { waNumId: { contains: "1266389426549974" } },
                { waId: { contains: "867860609467932" } },
                { businessId: { in: [1, 11] } }
            ]
        }
    });
    console.log("CrmSettings found:", JSON.stringify(settings, null, 2));

    const businesses = await prisma.business.findMany({
        where: { id: { in: [1, 11] } }
    });
    console.log("\nBusinesses found:", JSON.stringify(businesses, null, 2));
}

checkCrmSettings().catch(console.error).finally(() => prisma.$disconnect());
