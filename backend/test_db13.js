const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const courses = await prisma.course.findMany({
        where: { name: { contains: "Aruni Yashoda" } },
        include: { lecturer: true, group: true }
    });
    
    console.log("Courses for Aruni Yashoda:");
    for (let c of courses) {
        console.log(`Course ID: ${c.id}, Name: ${c.name}, Lecturer: ${c.lecturer?.name}, Image: ${c.lecturer?.image}, Batch: ${c.group?.batchId}, Type: ${c.group?.type}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
