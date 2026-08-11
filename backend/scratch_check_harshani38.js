const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { id: { in: [48, 49, 35, 64, 33, 347] } }
    });
    users.forEach(u => console.log(`${u.id}: ${u.firstName} ${u.lastName}`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
