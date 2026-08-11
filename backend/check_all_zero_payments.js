const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const zeroPayments = await prisma.payment.findMany({
        where: { amount: 0, status: 0 },
        orderBy: { id: 'desc' }
    });
    console.log(`Found ${zeroPayments.length} pending zero payments`);
    console.log(zeroPayments.map(p => ({ id: p.id, amount: p.amount, status: p.status, method: p.method, remark: p.remark })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
