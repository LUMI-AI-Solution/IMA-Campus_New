const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const log = await prisma.systemAuditLog.findFirst({
        orderBy: { createdAt: 'asc' }
    });
    console.log(log);
}
main().catch(console.error).finally(() => prisma.$disconnect());
