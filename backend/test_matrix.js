const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const batch = await prisma.batch.findFirst({
        orderBy: { createdAt: 'desc' }
    });
    console.log("Batch:", batch.id);

    const rawGroups = await prisma.group.findMany({
        where: { batchId: batch.id },
        orderBy: { itemOrder: 'asc' },
        select: { id: true, name: true }
    });
    console.log("Raw Groups:", rawGroups.length);
    const monthlyGroups = rawGroups.filter(g => !g.name.toLowerCase().includes('full payment') && !g.name.toLowerCase().includes('full'));
    console.log("Monthly Groups:", monthlyGroups.length);

    const courses = await prisma.course.findMany({
        where: { group: { batchId: batch.id } },
        select: { id: true, name: true, code: true, startMonth: true, endMonth: true }
    });
    console.log("Courses:", courses.length);

    const payments = await prisma.payment.findMany({
        where: { batchId: batch.id, status: 1 },
        include: { student: { select: { id: true, firstName: true, lastName: true } } }
    });
    console.log("Payments:", payments.length);
    process.exit(0);
}
run().catch(console.error);
