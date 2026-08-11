const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const leads = await prisma.lead.findMany({
        where: { phone: { startsWith: '94765652305_BIZ_6' } }
    });
    console.log(JSON.stringify(leads, null, 2));
}
test().finally(() => prisma.$disconnect());
