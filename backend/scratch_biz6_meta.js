const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const msgs = await prisma.chatMessage.findMany({
        where: { senderName: 'AutoBot', lead: { campaignType: 'FREE_SEMINAR', phone: { contains: '_BIZ_6' } } },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(msgs, null, 2));
}
test().finally(() => prisma.$disconnect());
