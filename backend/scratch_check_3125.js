const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const p = await prisma.payment.findUnique({
        where: { id: 3125 },
        include: { actionedUser: true, student: true }
    });
    console.log(p);
}
main().finally(() => prisma.$disconnect());
