const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const courses = await prisma.contentCourse.findMany({
        where: { content_id: { in: [522, 521, 517, 512, 511] } }
    });
    console.log(courses);
}
main().catch(console.error).finally(() => prisma.$disconnect());
