const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { OR: [{ firstName: { contains: 'Harshani' } }, { lastName: { contains: 'Harshani' } }] }
    });
    console.log(users.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}` })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
