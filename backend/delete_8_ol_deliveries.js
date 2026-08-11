const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function delete8PendingDeliveries() {
    try {
        const olBiz = await prisma.business.findFirst({ where: { name: { contains: 'O/L' } } });
        console.log('Target Business:', olBiz.id, olBiz.name);

        const targetDeliveries = await prisma.delivery.findMany({
            where: { businessId: olBiz.id, status: 'Pending' },
            include: { items: true }
        });

        console.log(`Found ${targetDeliveries.length} Pending Deliveries to delete:`);
        const deliveryIds = targetDeliveries.map(d => d.id);
        console.log('Delivery IDs:', deliveryIds);

        for (const d of targetDeliveries) {
            console.log(`- Delivery ID: ${d.id} | Student ID: ${d.studentId} | Items: ${d.items.length}`);
        }

        if (targetDeliveries.length > 0) {
            // Delete DeliveryItems first
            const deletedItems = await prisma.deliveryItem.deleteMany({
                where: { deliveryId: { in: deliveryIds } }
            });
            console.log(`Deleted ${deletedItems.count} DeliveryItems.`);

            // Delete Deliveries
            const deletedDeliveries = await prisma.delivery.deleteMany({
                where: { id: { in: deliveryIds } }
            });
            console.log(`Successfully deleted ${deletedDeliveries.count} Pending Deliveries.`);
        } else {
            console.log('No pending deliveries found to delete.');
        }

    } catch (e) {
        console.error('Deletion Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

delete8PendingDeliveries();
