const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const p = await prisma.payment.findFirst({ where: { payment_type: 3, groupId: { not: null } } });
    console.log(p);
}
run();
