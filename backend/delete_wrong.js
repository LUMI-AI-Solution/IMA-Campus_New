const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteWrongDeliveries() {
    const deliveries = await prisma.delivery.findMany({
        where: {
            paymentType: 'Monthly',
            status: 'Pending'
        },
        include: {
            payment: true,
            items: {
                include: { course: true }
            }
        }
    });

    let deletedItemsCount = 0;
    let deletedDeliveriesCount = 0;

    for (const d of deliveries) {
        if (!d.payment || !d.payment.groupId) continue;
        
        let shouldKeepItemsCount = 0;

        for (const item of d.items) {
            let shouldDeliver = false;
            if (item.course && item.course.groupPrices) {
                try {
                    const gps = JSON.parse(item.course.groupPrices);
                    const match = gps.find(g => g.groupId == d.payment.groupId);
                    if (match && (match.deliverTute === true || match.deliverTute === 'true')) {
                        shouldDeliver = true;
                    }
                } catch(e) {}
            }
            if (!shouldDeliver) {
                await prisma.deliveryItem.delete({
                    where: { id: item.id }
                });
                deletedItemsCount++;
                console.log(`Deleted wrong delivery item ${item.id} (${item.tuteName}) from delivery ${d.id}`);
            } else {
                shouldKeepItemsCount++;
            }
        }

        if (shouldKeepItemsCount === 0 && d.items.length > 0) {
            await prisma.delivery.delete({
                where: { id: d.id }
            });
            deletedDeliveriesCount++;
            console.log(`Deleted empty delivery record ${d.id}`);
        }
    }

    console.log(`Successfully deleted ${deletedItemsCount} wrong delivery items and ${deletedDeliveriesCount} empty delivery records.`);
}

deleteWrongDeliveries().finally(() => prisma.$disconnect());
