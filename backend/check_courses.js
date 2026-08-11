const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const courses = await prisma.course.findMany({
        where: { id: { in: [258, 264, 325, 327, 329, 330] } },
        include: { tuteStocks: true }
    });

    console.log("Courses:");
    console.log(JSON.stringify(courses, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
