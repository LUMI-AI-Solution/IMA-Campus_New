const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const leads = await prisma.lead.findMany({
        where: { phone: { contains: '_BIZ_6' }, campaignType: 'FREE_SEMINAR', sequenceCompleted: false },
        orderBy: { updatedAt: 'desc' },
        take: 3
    });
    console.log(JSON.stringify(leads, null, 2));
}
test().finally(() => prisma.$disconnect());
