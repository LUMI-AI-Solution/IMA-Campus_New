const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const courses33 = await prisma.course.findMany({
        where: { code: '33' },
        select: { id: true, name: true, code: true }
    });
    console.log("Courses with code 33:");
    console.dir(courses33, { maxArrayLength: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
