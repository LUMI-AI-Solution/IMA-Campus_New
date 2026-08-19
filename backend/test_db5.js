const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const courses = await prisma.course.findMany({
        where: { name: { contains: "History" } },
        include: { group: true }
    });
    
    console.log("History Courses and their Batches:");
    for (let c of courses) {
        console.log(`ID: ${c.id}, Name: ${c.name}, Code: ${c.code}, BatchID: ${c.group?.batchId}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
