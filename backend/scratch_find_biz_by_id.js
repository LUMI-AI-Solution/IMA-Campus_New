const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const b = await prisma.business.findUnique({ where: { id: 1 } });
    console.log("Business with ID 1:", b);
}
main().finally(() => prisma.$disconnect());
