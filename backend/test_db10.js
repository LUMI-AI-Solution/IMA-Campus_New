const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const contents = await prisma.content.findMany({
        where: { title: { contains: "ඉන්දික" } },
        select: { id: true, title: true }
    });
    console.log("Contents with 'ඉන්දික':");
    console.dir(contents, { maxArrayLength: null });
    
    for (let c of contents) {
        const links = await prisma.contentCourse.findMany({
            where: { content_id: c.id }
        });
        
        for (let l of links) {
            const course = await prisma.course.findUnique({
                where: { id: Number(l.course_id) }
            });
            console.log("Content:", c.title, "=> Course:", course?.id, course?.name, course?.code);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
