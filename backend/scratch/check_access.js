const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const payment = await prisma.payment.findUnique({ where: { id: 4229 } });
    console.log("Payment 4229:", payment);
}

main().finally(() => prisma.$disconnect());
