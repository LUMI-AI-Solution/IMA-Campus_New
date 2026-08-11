const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const payments = await prisma.payment.findMany({
        where: { studentId: 1679 },
        include: {
            delivery: { include: { items: true } }
        }
    });

    console.log(JSON.stringify(payments, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
