const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const payment = await prisma.payment.findFirst({
        where: { aiVerified: true },
        include: { student: true, batch: true },
        orderBy: { id: 'desc' }
    });
    console.log("Recent verified payment:", payment);
}
run();
