const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const p = await prisma.payment.findMany({ where: { subjects: { not: null } }, take: 10, select: { id: true, status: true, subjects: true } });
    console.log(p);
}
main().catch(console.error).finally(() => prisma.$disconnect());
