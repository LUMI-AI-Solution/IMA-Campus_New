const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const p = await prisma.payment.findFirst({ where: { aiVerified: true } });
    console.log(p);
}
run();
