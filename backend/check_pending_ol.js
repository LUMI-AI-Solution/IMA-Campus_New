const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPendingOL() {
    try {
        const olBiz = await prisma.business.findFirst({ where: { name: { contains: 'O/L' } } });
        const deliveries = await prisma.delivery.findMany({
            where: { businessId: olBiz.id, status: 'Pending' },
            include: { items: { include: { course: true } } },
            orderBy: { id: 'desc' }
        });

        console.log(`Found ${deliveries.length} Pending deliveries for O/L business (${olBiz.name}):\n`);

        deliveries.forEach(d => {
            console.log(`Delivery ID: ${d.id} | StudentID: ${d.studentId} | Items Count: ${d.items.length} | Date: ${d.createdAt}`);
            d.items.forEach(it => {
                console.log(`   - Item ID: ${it.id} | TuteName: ${it.tuteName} | Subject: ${it.course ? it.course.name : 'N/A'}`);
            });
            console.log('');
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
checkPendingOL();
