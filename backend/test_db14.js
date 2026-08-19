const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const courses = await prisma.course.findMany({
        where: { name: { contains: "Aruni Yashoda" } },
        select: { id: true, name: true, lecturerName: true, groupPrices: true, group: { select: { name: true, type: true } } }
    });
    
    console.log("Aruni Yashoda Courses:");
    for (let c of courses) {
        console.log(`Course ID: ${c.id}, Name: ${c.name}, Group: ${c.group?.name} (Type: ${c.group?.type})`);
        console.log(`Prices: ${c.groupPrices}`);
        console.log("-----------------------");
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
