const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const pending = await prisma.delivery.findMany({
        where: { status: { in: ['Pending', 'Hold'] } },
        include: { items: true, payment: { include: { student: true } } }
    });
    
    let found = false;
    for (let d of pending) {
        const courseIds = d.items.map(i => i.courseId);
        const uniqueCourses = new Set(courseIds);
        if (courseIds.length !== uniqueCourses.size) {
            console.log(`Delivery ID: ${d.id}, Student: ${d.payment?.student?.firstName}, Total Items: ${d.items.length}, Unique Courses: ${uniqueCourses.size}`);
            console.log(JSON.stringify(d.items, null, 2));
            found = true;
            break;
        }
    }
    if (!found) {
        console.log("No duplicate items found inside any single delivery!");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
