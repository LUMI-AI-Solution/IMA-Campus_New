const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.systemAuditLog.findMany({
        where: {
            endpoint: { contains: "assign" }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
    console.log(logs.map(l => ({ id: l.id, endpoint: l.endpoint, payload: l.payload, date: l.createdAt })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
