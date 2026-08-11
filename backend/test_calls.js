const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
    const logs = await prisma.whatsAppCallRecord.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log(logs);
}
test();
