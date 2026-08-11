const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const payments = await prisma.payment.findMany({
        orderBy: { id: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(payments, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
