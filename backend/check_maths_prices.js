const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGroupPrices() {
    const courses = await prisma.course.findMany({
        where: {
            name: {
                contains: 'Mathematics'
            }
        },
        include: { group: true }
    });

    for (const c of courses) {
        console.log(`\nCourse: ${c.name} | Lecturer: ${c.lecturerName} | Group Type: ${c.group?.type}`);
        if (c.groupPrices) {
            try {
                const gps = JSON.parse(c.groupPrices);
                console.log("Group Prices:", JSON.stringify(gps, null, 2));
            } catch (e) {
                console.log("Error parsing group prices:", c.groupPrices);
            }
        } else {
            console.log("No groupPrices set.");
        }
    }
}

checkGroupPrices().finally(() => prisma.$disconnect());
