const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { id: 49 },
        select: { firstName: true, lastName: true, role: true }
    });
    console.log(user);
}
main().catch(console.error).finally(() => prisma.$disconnect());
