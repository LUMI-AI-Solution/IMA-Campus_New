const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const leads = await prisma.lead.findMany({
        where: { phone: { contains: '_BIZ_6' }, campaignType: 'FREE_SEMINAR' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { messages: true }
    });
    console.log(JSON.stringify(leads, null, 2));
}
test().finally(() => prisma.$disconnect());
