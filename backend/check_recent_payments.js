const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const recent = await prisma.payment.findMany({
        orderBy: { id: 'desc' },
        take: 3
    });
    console.log(recent.map(p => ({ id: p.id, amount: p.amount, status: p.status, method: p.method, created_at: p.created_at, remark: p.remark })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
