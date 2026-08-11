const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const p = await prisma.payment.findUnique({ where: { id: 2955 } });
    console.log(p.slip_image);
}
main().catch(console.error).finally(() => prisma.$disconnect());
