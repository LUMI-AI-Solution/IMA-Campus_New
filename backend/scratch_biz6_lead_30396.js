const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const msgs = await prisma.chatMessage.findMany({
        where: { leadId: 30396 },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(msgs, null, 2));
}
test().finally(() => prisma.$disconnect());
