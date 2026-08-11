const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const recent = await prisma.payment.findMany({
        where: { actionedById: 563, status: 1 },
        orderBy: { updatedAt: 'desc' },
        take: 5
    });
    console.log(recent.map(r => ({ id: r.id, updatedAt: r.updatedAt, created_at: r.created_at })));
}
main().finally(() => prisma.$disconnect());
