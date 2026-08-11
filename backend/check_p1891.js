const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const p = await prisma.payment.findUnique({
        where: { id: 1891 },
        include: { auditLogs: true }
    });
    console.log(JSON.stringify(p, null, 2));

    const updatedPayment = p;
    let shouldCreateDelivery = true;
    if (updatedPayment.payment_type === 1) {
        if (updatedPayment.groupId) {
            const ext = await prisma.delivery.findFirst({
                where: { studentId: updatedPayment.studentId.toString(), paymentType: 'Monthly', payment: { groupId: updatedPayment.groupId } }
            });
            if (ext) {
                console.log("ext found! skipping");
                shouldCreateDelivery = false;
            } else {
                console.log("No ext found. Proceeding...");
            }
        }
    }
}
check().catch(console.error).finally(() => prisma.$disconnect());
