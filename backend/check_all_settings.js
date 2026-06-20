const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllSettings() {
    try {
        const settings = await prisma.crmSettings.findMany({});
        console.log("All Settings:", JSON.stringify(settings, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkAllSettings();
