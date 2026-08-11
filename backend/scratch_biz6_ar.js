const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const replies = await prisma.autoReply.findMany({
        where: { businessId: 6, campaignType: 'FREE_SEMINAR' }
    });
    console.log(JSON.stringify(replies, null, 2));
}
test().finally(() => prisma.$disconnect());
