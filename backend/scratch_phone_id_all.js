const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const settings = await prisma.crmSettings.findMany({
        where: { waNumId: '1170221226166970' }
    });
    console.log(JSON.stringify(settings, null, 2));
}
test().finally(() => prisma.$disconnect());
