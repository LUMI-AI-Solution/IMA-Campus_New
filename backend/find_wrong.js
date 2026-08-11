const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findWrongDeliveries() {
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

    const wrongDeliveries = [];

    for (const d of deliveries) {
        if (!d.payment || !d.payment.groupId) continue;
        
        let isWrong = false;
        let wrongItems = [];

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
                isWrong = true;
                wrongItems.push(item.tuteName);
            }
        }

        if (isWrong) {
            wrongDeliveries.push({
                deliveryId: d.id,
                studentId: d.studentId,
                wrongItems: wrongItems
            });
        }
    }

    console.log(`Found ${wrongDeliveries.length} wrong Monthly deliveries that ignore the tick.`);
    // console.log(JSON.stringify(wrongDeliveries, null, 2));
}

findWrongDeliveries().finally(() => prisma.$disconnect());
