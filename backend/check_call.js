const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const calls = await prisma.whatsAppCallRecord.findMany({
        where: { leadPhone: '94722882344' },
        orderBy: { createdAt: 'desc' }
    });
    console.log(JSON.stringify(calls, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
