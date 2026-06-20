const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const courses = await prisma.course.findMany({
        where: { id: { in: [78, 79, 81, 37, 40, 56] } },
        include: { group: true }
    });

    courses.forEach(c => {
        console.log(`Course ID: ${c.id}, Code: ${c.code}, Name: ${c.name}, Group: ${c.group ? c.group.name : 'N/A'}`);
    });
}
check().catch(console.error).finally(() => prisma.$disconnect());
