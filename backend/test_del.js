const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const d = await prisma.delivery.findFirst({
        where: { id: 1804 },
        include: { items: { include: { course: true } } }
    });
    console.log(d.items[0]);
}
main().finally(() => prisma.$disconnect());
