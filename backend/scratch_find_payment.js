const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const payments = await prisma.payment.findMany({
        where: { amount: 9000 },
        orderBy: { created_at: 'desc' },
        take: 10
    });
    console.log(payments);
}
main().catch(console.error).finally(() => prisma.$disconnect());
