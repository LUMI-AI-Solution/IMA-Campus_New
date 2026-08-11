const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const course = await prisma.course.findFirst({
        where: { groupPrices: { contains: "deliverTute" } }
    });
    console.log(course.groupPrices);
}

check().catch(console.error).finally(() => prisma.$disconnect());
