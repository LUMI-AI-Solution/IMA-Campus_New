const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const englishContents = await prisma.content.findMany({
        where: { title: { contains: "English - Paper No. 01" } },
        select: { id: true, title: true }
    });
    console.log("English contents:");
    console.dir(englishContents, { maxArrayLength: null });
    
    if (englishContents.length > 0) {
        const links = await prisma.contentCourse.findMany({
            where: { content_id: englishContents[0].id }
        });
        console.log("Linked courses for this English content:", links);
        
        for (let l of links) {
            const course = await prisma.course.findUnique({
                where: { id: l.course_id },
                include: { group: true }
            });
            console.log("Course details:", course.id, course.name, course.code, "Batch:", course.group?.batchId);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
