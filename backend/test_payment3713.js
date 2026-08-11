const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const payment = await prisma.payment.findUnique({
        where: { id: 3713 },
        include: { business: true, batch: true }
    });
    console.log(JSON.stringify(payment, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
