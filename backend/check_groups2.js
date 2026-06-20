const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const groups = await prisma.group.findMany({
        where: { name: { contains: 'MAY' } },
        include: { courses: true }
    });

    groups.forEach(g => {
        console.log(`Group ID: ${g.id}, Name: ${g.name}, Batch ID: ${g.batchId}, Courses:`, g.courses.map(c => c.id));
    });
}
check().catch(console.error).finally(() => prisma.$disconnect());
