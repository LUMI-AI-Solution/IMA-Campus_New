const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const cc = await prisma.contentCourse.findMany({ where: { course_id: 317 } });
    console.log("Course 317 has " + cc.length + " contents");
    const courses = await prisma.course.findMany({ where: { id: { in: [317, 318, 320] } } });
    console.log("Courses:", courses.map(c => c.name));
}

main().finally(() => prisma.$disconnect());
