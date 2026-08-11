const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.systemLog.findMany({
        where: { action: { contains: 'assign' } },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
    console.log("Recent assignment logs:");
    logs.forEach(l => console.log(`${l.createdAt}: ${l.action} - ${l.details}`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
