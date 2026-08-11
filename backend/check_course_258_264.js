const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const courses = await prisma.course.findMany({
        where: { id: { in: [258, 264] } },
        select: { id: true, name: true, groupPrices: true }
    });

    console.log(JSON.stringify(courses, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
