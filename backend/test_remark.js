const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const d = await prisma.delivery.findFirst({where: {trackingNumber: 'BG065529265LK'}, include: {payment: true}});
    if (d) {
        console.log('Delivery:', {id: d.id, studentId: d.studentId, packRemark: d.packRemark, paymentStudentId: d.payment?.studentId});
    } else {
        console.log('Not found');
    }
}
main();
