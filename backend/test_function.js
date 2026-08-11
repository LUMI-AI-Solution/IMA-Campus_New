const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const deliveries = await prisma.delivery.findMany({
        where: { status: { in: ['Pending', 'Hold'] } },
        include: {
            items: true,
            payment: { include: { student: true, batch: true, group: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    const courseIds = [...new Set(deliveries.flatMap(d => d.items.map(i => i.courseId)).filter(Boolean))];
    const courses = await prisma.course.findMany({
        where: { id: { in: courseIds.map(id => parseInt(id)) } }
    });

    const formatted = deliveries.map(d => {
        return {
            id: d.id,
            studentName: d.payment?.student?.firstName,
            items: d.items.map(item => {
                const course = courses.find(c => c.id === item.courseId);
                return {
                    id: item.id,
                    courseId: item.courseId,
                    tuteName: item.tuteName,
                    courseName: course?.name || 'Subject'
                };
            })
        };
    });
    
    let found = false;
    for (let f of formatted) {
        if (f.items.length >= 8) {
            console.log(`Found: ${f.studentName} with ${f.items.length} items`);
            console.log(JSON.stringify(f.items, null, 2));
            found = true;
            break;
        }
    }
    if (!found) {
        console.log("No delivery has 8 items after formatting!");
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
