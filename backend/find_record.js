const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const records = await prisma.whatsAppCallRecord.findMany({
        where: { recordingUrl: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(records, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
