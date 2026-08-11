const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const nullPayments = await prisma.payment.findMany({
        where: { amount: null, status: 0 }
    });
    console.log(`Found ${nullPayments.length} pending null payments`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
