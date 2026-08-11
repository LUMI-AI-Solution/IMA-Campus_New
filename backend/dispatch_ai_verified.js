const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dispatchAiVerified() {
    const pendingPayments = await prisma.payment.findMany({
        where: {
            aiVerified: true,
            status: 1,
            delivery: null
        }
    });

    console.log(`Found ${pendingPayments.length} AI Verified payments to process for delivery.`);

    let dispatchedCount = 0;

    for (const payment of pendingPayments) {
        let shouldCreateDelivery = true;

        if (payment.payment_type === 1) { // Monthly
            if (payment.groupId) {
                const ext = await prisma.delivery.findFirst({
                    where: { studentId: payment.studentId.toString(), paymentType: 'Monthly', payment: { groupId: payment.groupId } }
                });
                if (ext) shouldCreateDelivery = false;
            }
        } else if (payment.payment_type === 2 || payment.payment_type === 3) { // Installment or Full
            if (payment.batchId) {
                const ext = await prisma.delivery.findFirst({
                    where: { studentId: payment.studentId.toString(), paymentType: { in: ['Installment', 'Full'] }, payment: { batchId: payment.batchId } }
                });
                if (ext) shouldCreateDelivery = false;
            }
        }

        if (shouldCreateDelivery && payment.subjects) {
            try {
                const subIds = JSON.parse(payment.subjects).map(id => parseInt(id));
                const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
                
                const deliverableCourses = [];

                for (const course of courses) {
                    let deliverTute = false;
                    let tuteName = course.name || "Tute";

                    if (course.groupPrices && payment.groupId) {
                        try {
                            const gps = JSON.parse(course.groupPrices);
                            const match = gps.find(g => g.groupId == payment.groupId);
                            if (match && (match.deliverTute === true || match.deliverTute === 'true')) {
                                deliverTute = true;
                                if (match.tuteName) tuteName = match.tuteName;
                            }
                        } catch(e) {}
                    }

                    if (deliverTute) {
                        deliverableCourses.push({
                            courseId: course.id,
                            tuteName: tuteName,
                            quantity: 1
                        });
                    }
                }

                if (deliverableCourses.length > 0) {
                    const paymentTypeStr = payment.payment_type === 1 ? 'Monthly' : (payment.payment_type === 2 ? 'Installment' : 'Full');
                    await prisma.delivery.create({
                        data: {
                            paymentId: payment.id,
                            studentId: payment.studentId.toString(),
                            businessId: payment.businessId,
                            paymentType: paymentTypeStr,
                            status: 'Pending',
                            items: { create: deliverableCourses }
                        }
                    });
                    dispatchedCount++;
                    console.log(`Dispatched Delivery for Payment ID: ${payment.id} with ${deliverableCourses.length} tutes.`);
                } else {
                    console.log(`Payment ID: ${payment.id} processed, but no deliverable tutes found based on Content Hub rules.`);
                }
            } catch (e) {
                console.error(`Error processing payment ID ${payment.id}:`, e.message);
            }
        }
    }

    console.log(`\nSuccessfully dispatched ${dispatchedCount} deliveries.`);
}

dispatchAiVerified()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
