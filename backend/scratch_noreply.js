const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const leads = await prisma.lead.findMany({
        where: { campaignType: 'FREE_SEMINAR', sequenceCompleted: false, autoReplyStep: 0 },
        orderBy: { updatedAt: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(leads, null, 2));
}
test().finally(() => prisma.$disconnect());
