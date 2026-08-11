const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.crmSettings.findFirst();
    console.log("Settings:", settings);
}
main().catch(console.error).finally(() => prisma.$disconnect());
