const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOL() {
    try {
        console.log('--- Inspecting O/L Deliveries in DB ---');
        
        // Find Business ID for O/L
        const olBiz = await prisma.business.findFirst({
            where: { name: { contains: 'O/L' } }
        });
        console.log('O/L Business:', olBiz.id, olBiz.name);

        // Fetch recent deliveries for O/L business
        const deliveries = await prisma.delivery.findMany({
            where: { businessId: olBiz.id },
            include: {
                items: { include: { course: true } },
                payment: true
            },
            orderBy: { id: 'desc' },
            take: 30
        });

        console.log(`Found ${deliveries.length} recent deliveries for O/L business`);

        let countUnticked = 0;
        const untickedItemsList = [];

        for (const d of deliveries) {
            for (const item of d.items) {
                const course = item.course;
                const groupId = d.payment ? d.payment.groupId : null;
                let deliverTuteConfigured = false;

                if (course && course.groupPrices && groupId) {
                    try {
                        const gps = JSON.parse(course.groupPrices);
                        const match = gps.find(g => g.groupId == groupId);
                        if (match && (match.deliverTute === true || match.deliverTute === 'true')) {
                            deliverTuteConfigured = true;
                        }
                    } catch(e) {}
                }

                if (!deliverTuteConfigured) {
                    countUnticked++;
                    untickedItemsList.push({
                        itemId: item.id,
                        deliveryId: d.id,
                        deliveryStatus: d.status,
                        paymentId: d.paymentId,
                        paymentType: d.payment ? d.payment.payment_type : 'N/A',
                        studentId: d.studentId,
                        courseName: course ? course.name : 'N/A',
                        tuteName: item.tuteName,
                        createdAt: d.createdAt
                    });
                }
            }
        }

        console.log(`\nTotal unticked items in recent 30 O/L deliveries: ${countUnticked}`);
        console.log(JSON.stringify(untickedItemsList, null, 2));

        // Group by status
        const statusMap = {};
        untickedItemsList.forEach(it => {
            statusMap[it.deliveryStatus] = (statusMap[it.deliveryStatus] || 0) + 1;
        });
        console.log('\nStatus Breakdown:', JSON.stringify(statusMap));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}
checkOL();
