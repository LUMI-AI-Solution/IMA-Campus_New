const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const courses = await prisma.course.findMany({
        where: { group: { batchId: 41 } },
        select: { id: true, name: true, code: true }
    });
    console.log("Courses in Batch 41:");
    console.dir(courses, { maxArrayLength: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
