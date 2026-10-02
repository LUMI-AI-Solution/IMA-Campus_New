const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getDeliverableCoursesForPayment } = require('./controllers/paymentController');

async function dispatchAiVerified() {
    console.log("Checking for AI-Verified payments without delivery records...");

    const pendingPayments = await prisma.payment.findMany({
        where: {
            status: 1,
            delivery: null
        },
        include: {
            student: true,
            batch: true,
            group: true
        }
    });

    console.log(`Found ${pendingPayments.length} approved payments without delivery.`);

    let dispatchedCount = 0;

    for (const payment of pendingPayments) {
        if (!payment.subjects) continue;

        try {
            const rawSubs = typeof payment.subjects === 'string' ? JSON.parse(payment.subjects) : payment.subjects;
            const subIds = Array.isArray(rawSubs) ? rawSubs.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0) : [];
            if (subIds.length === 0) continue;

            const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
            if (!courses || courses.length === 0) continue;

            const deliverableCourses = await getDeliverableCoursesForPayment(payment, courses);

            if (deliverableCourses && deliverableCourses.length > 0) {
                const pType = parseInt(payment.payment_type !== undefined ? payment.payment_type : payment.paymentType, 10);
                const paymentTypeStr = pType === 1 ? 'Monthly' : (pType === 2 ? 'Installment' : 'Full');

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

    console.log(`\nSuccessfully dispatched ${dispatchedCount} deliveries.`);
}

dispatchAiVerified()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
