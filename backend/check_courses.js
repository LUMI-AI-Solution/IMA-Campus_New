const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const courses = await prisma.course.findMany({
        where: { id: { in: [33, 46, 49, 34, 44, 45, 50] } },
        include: { group: true }
    });

    courses.forEach(c => {
        console.log(`Course ID: ${c.id}, Name: ${c.name}, Group: ${c.group ? c.group.name : 'N/A'}`);
    });
}
check().finally(() => prisma.$disconnect());
