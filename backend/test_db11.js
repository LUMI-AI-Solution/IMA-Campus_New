const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const courses = await prisma.course.findMany({
        where: { code: '31' },
        select: { id: true, name: true, code: true, group: { select: { batchId: true } } }
    });
    console.log("Courses with code 31:");
    console.dir(courses, { maxArrayLength: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
