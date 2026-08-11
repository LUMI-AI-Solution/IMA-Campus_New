const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const zeroPayments = await prisma.payment.findMany({
        where: { amount: 0 },
        take: 5
    });
    console.log(`Found ${zeroPayments.length} zero payments`);
    console.log(zeroPayments);
}
main().catch(console.error).finally(() => prisma.$disconnect());
