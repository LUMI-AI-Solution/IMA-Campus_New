const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const msgs = await prisma.chatMessage.findMany({
        where: { leadId: 57329 },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true, message: true, senderType: true }
    });
    console.table(msgs);
    await prisma.$disconnect();
}
check();
