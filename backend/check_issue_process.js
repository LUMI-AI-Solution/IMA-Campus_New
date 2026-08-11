const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudent(studentId) {
    console.log(`\n========================================`);
    console.log(`CHECKING STUDENT ID: ${studentId}`);
    console.log(`========================================\n`);

    const payments = await prisma.payment.findMany({
        where: { studentId: parseInt(studentId), status: 1 },
        orderBy: { created_at: 'asc' },
        include: { auditLogs: true }
    });

    for (const p of payments) {
        console.log(`[PAYMENT ID: ${p.id}] - Date: ${p.created_at.toISOString().split('T')[0]} - Group: ${p.groupId}`);
        console.log(`Subjects Paid: ${p.subjects}`);
        
        const deliveries = await prisma.delivery.findMany({
            where: { paymentId: p.id },
            include: { items: true }
        });

        if (deliveries.length === 0) {
            console.log(`  --> ❌ NO DELIVERY CREATED FOR THIS PAYMENT! (Skipped by system)`);
        } else {
            for (const d of deliveries) {
                console.log(`  --> ✅ Delivery ID: ${d.id} Created.`);
                for (const item of d.items) {
                    console.log(`       - Tute Name Generated: "${item.tuteName}" (Course ${item.courseId})`);
                }
            }
        }
        console.log(`----------------------------------------`);
    }
}

async function main() {
    await checkStudent(975);
    await checkStudent(1373);
}

main().catch(console.error).finally(() => prisma.$disconnect());
