const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { id: { in: [48, 49, 35, 64, 347, 308, 3745] } },
        select: { id: true, firstName: true, lastName: true, role: true }
    });
    console.log(users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
