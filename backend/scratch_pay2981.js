const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const pay = await prisma.payment.findUnique({
        where: { id: 2981 },
        include: { student: true, batch: true }
    });
    console.log(JSON.stringify(pay, null, 2));
}
test().finally(() => prisma.$disconnect());
