const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const courses = await prisma.course.findMany({
        where: { group: { batchId: 41 } }, // one of the target batches
        take: 3
    });
    console.log("Courses in Batch 41:");
    courses.forEach(c => {
        console.log(`Course: ${c.name}`);
        console.log(`Lecturer: ${c.lecturerName}`);
        console.log(`GroupPrices: ${c.groupPrices}`);
    });
}

check().catch(console.error).finally(() => prisma.$disconnect());
