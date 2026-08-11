const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.systemAuditLog.findMany({
        where: {
            OR: [
                { details: { contains: "40" } },
                { action: { contains: "BATCH" } },
                { action: { contains: "LEAD" } }
            ]
        },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
    console.log(logs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
