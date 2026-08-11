const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const users = await prisma.user.findMany({
        where: { id: { in: [3745, 3722, 308] } },
        select: { id: true, firstName: true, role: true }
    });
    console.table(users);
    await prisma.$disconnect();
}
check();
