const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const leads = await prisma.lead.findMany({
        where: { phone: { contains: '_BIZ_1' }, campaignType: 'FREE_SEMINAR' },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 2 } }
    });
    console.log(JSON.stringify(leads, null, 2));
}
test().finally(() => prisma.$disconnect());
