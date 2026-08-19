const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const courses = await prisma.course.findMany({
        where: { name: { contains: "History" } }
    });
    const historyCourseIds = courses.map(c => BigInt(c.id));
    
    const links = await prisma.contentCourse.findMany({
        where: { course_id: { in: historyCourseIds } }
    });
    
    const contents = await prisma.content.findMany({
        where: { id: { in: links.map(l => l.content_id) } },
        select: { id: true, title: true }
    });
    
    console.log("Contents linked to History courses:");
    for (let c of contents) {
        if (c.title.includes("English") || c.title.includes("සාහිත්‍ය")) {
            console.log("SUSPICIOUS CONTENT LINKED TO HISTORY:", c.id, c.title);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
