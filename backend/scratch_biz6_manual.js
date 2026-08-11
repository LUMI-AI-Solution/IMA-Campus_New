const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const msgs = await prisma.chatMessage.findMany({
        where: { senderType: 'USER', direction: 'outbound', lead: { campaignType: 'FREE_SEMINAR', phone: { contains: '_BIZ_6' } } },
        orderBy: { createdAt: 'desc' },
        take: 3
    });
    console.log(JSON.stringify(msgs, null, 2));
}
test().finally(() => prisma.$disconnect());
