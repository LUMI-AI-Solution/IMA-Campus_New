const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { id: { in: [49, 35, 48, 54, 799, 800, 1136] } },
        select: { id: true, firstName: true, role: true }
    });
    console.log("Users:", users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
