const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const slip = await prisma.slip.findUnique({
        where: { id: 2981 },
        include: { lead: true }
    });
    console.log(JSON.stringify(slip, null, 2));
}
test().finally(() => prisma.$disconnect());
