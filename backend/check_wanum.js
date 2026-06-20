const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWaNum() {
    try {
        const settings = await prisma.crmSettings.findFirst({
            where: { waNumId: "314643098410292" }
        });
        console.log("Settings for 314643098410292:", JSON.stringify(settings, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkWaNum();
