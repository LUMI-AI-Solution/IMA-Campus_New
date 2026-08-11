const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const groups = await prisma.group.findMany({
        where: { id: { in: [10, 12, 19, 20, 139, 140, 141] } }
    });
    console.log(groups);
}
main().finally(() => prisma.$disconnect());
