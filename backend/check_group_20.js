const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const courses = await prisma.course.findMany({
        where: { id: { in: [282, 307, 308] } }
    });
    console.log("--- Checking Course Prices for Group 20 ---");
    for (const c of courses) {
        console.log(`Course ${c.id}: ${c.name}`);
        const gp = JSON.parse(c.groupPrices).find(g => g.groupId == 20);
        console.log("Group Price:", gp);
    }
}
check().catch(console.error).finally(() => prisma.$disconnect());
