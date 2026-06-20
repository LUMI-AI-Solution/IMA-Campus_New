const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function revert() {
    // 1. Find all upgraded payments that are approved
    const upgradedPayments = await prisma.payment.findMany({
        where: {
            remark: { contains: '[UPGRADE]' },
            status: 1
        }
    });
    
    console.log(`Found ${upgradedPayments.length} approved upgraded payments.`);
    
    let deletedDeliveries = 0;
    for (const p of upgradedPayments) {
        const d = await prisma.delivery.findUnique({ where: { paymentId: p.id } });
        if (d && d.status === 'Pending') {
            // Delete delivery items first because of foreign key constraint
            await prisma.deliveryItem.deleteMany({
                where: { deliveryId: d.id }
            });
            
            // Delete the delivery itself
            await prisma.delivery.delete({
                where: { id: d.id }
            });
            deletedDeliveries++;
        }
    }
    console.log(`Reverted ${deletedDeliveries} deliveries for upgraded payments.\n`);
}
revert().finally(() => prisma.$disconnect());
