const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Update the 3 valid deliveries that were marked as 'Full' by mistake
    const deliveriesToFix = [54, 93, 100];
    const updated = await prisma.delivery.updateMany({
        where: { id: { in: deliveriesToFix } },
        data: { paymentType: 'Monthly' }
    });
    console.log(`Updated ${updated.count} deliveries to 'Monthly'`);

    // 2. Handle Dinithi Himaya's duplicate delivery (ID 44)
    // We will delete it since she already has Delivery ID 56 which is 'Monthly' and 'On the way'
    const deliveryToDelete = 44;
    
    // First delete DeliveryItems for this delivery
    await prisma.deliveryItem.deleteMany({
        where: { deliveryId: deliveryToDelete }
    });
    
    // Then delete the Delivery
    await prisma.delivery.delete({
        where: { id: deliveryToDelete }
    });
    console.log(`Deleted duplicate Delivery ID ${deliveryToDelete} and its items`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
