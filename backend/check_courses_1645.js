const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const courses = await prisma.course.findMany({
        where: { id: { in: [326, 327, 328, 330] } }
    });
    for (const c of courses) {
        console.log(`Course ${c.id}: ${c.name}`);
        const gp = JSON.parse(c.groupPrices).find(g => g.groupId == 140);
        console.log("Group Price:", gp);
    }
}
check().catch(console.error).finally(() => prisma.$disconnect());
