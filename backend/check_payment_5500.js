const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const payment = await prisma.payment.findFirst({
        where: { amount: 5500, aiVerified: true },
        include: { student: true, batch: true, business: true },
        orderBy: { id: 'desc' }
    });
    console.log("Specific payment:", payment);
}
run();
