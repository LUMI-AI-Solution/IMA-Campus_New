const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSystemEvidence() {
    const studentId = 1645;
    console.log(`--- SYSTEM EVIDENCE FOR STUDENT ${studentId} ---`);
    
    // 1. Check their payments
    const payments = await prisma.payment.findMany({
        where: { studentId: studentId, status: { in: [1, 4] } },
        orderBy: { created_at: 'asc' }
    });

    for (const p of payments) {
        console.log(`\nPayment ID: ${p.id} | Date: ${p.created_at.toISOString().split('T')[0]} | Type: ${p.payment_type} | Group: ${p.groupId}`);
        console.log(`Subjects Paid For: ${p.subjects}`);
        
        // Find deliveries linked to this payment
        const deliveries = await prisma.delivery.findMany({
            where: { paymentId: p.id },
            include: { items: true }
        });

        if (deliveries.length === 0) {
            console.log(`❌ NO DELIVERY RECORD CREATED FOR PAYMENT ${p.id}`);
        } else {
            for (const d of deliveries) {
                console.log(`✅ Delivery ID: ${d.id} | Status: ${d.status}`);
                for (const item of d.items) {
                    console.log(`   -> Delivered Item: Course ${item.courseId} (${item.tuteName})`);
                }
            }
        }
    }
}

checkSystemEvidence().catch(console.error).finally(() => prisma.$disconnect());
