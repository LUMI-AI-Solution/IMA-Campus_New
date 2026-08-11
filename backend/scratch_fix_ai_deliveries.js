const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMissingDeliveries() {
    console.log("Starting missing deliveries fix...");
    const allAI = await prisma.payment.findMany({
        where: { aiVerified: true },
        include: { student: true, batch: true }
    });

    const deliveries = await prisma.delivery.findMany({
        where: { paymentId: { in: allAI.map(p => p.id) } }
    });

    const noDelivery = allAI.filter(p => !deliveries.find(d => d.paymentId === p.id));
    console.log(`Found ${noDelivery.length} AI Verified Slips with NO Delivery.`);

    for (const payment of noDelivery) {
        if (!payment.subjects) continue;
        
        try {
            const parsedPaymentType = payment.payment_type;
            let shouldCreateDelivery = true;
            if (parsedPaymentType === 1) {
                if (payment.groupId) {
                    const ext = await prisma.delivery.findFirst({
                        where: { studentId: payment.studentId.toString(), paymentType: 'Monthly', payment: { groupId: payment.groupId } }
                    });
                    if (ext) shouldCreateDelivery = false;
                }
            } else if (parsedPaymentType === 2 || parsedPaymentType === 3) {
                if (payment.batchId) {
                    const ext = await prisma.delivery.findFirst({
                        where: { studentId: payment.studentId.toString(), paymentType: { in: ['Installment', 'Full'] }, payment: { batchId: payment.batchId } }
                    });
                    if (ext) shouldCreateDelivery = false;
                }
            }

            if (shouldCreateDelivery) {
                const subIds = JSON.parse(payment.subjects).map(id => parseInt(id));
                const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });

                const deliverableCoursesMap = new Map();
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

                    if (deliverTute && !deliverableCoursesMap.has(tuteName)) {
                        deliverableCoursesMap.set(tuteName, { courseId: course.id, tuteName: tuteName, quantity: 1 });
                    }
                }
                const deliverableCourses = Array.from(deliverableCoursesMap.values());

                if (deliverableCourses.length > 0) {
                    const paymentTypeStr = parsedPaymentType === 1 ? 'Monthly' : (parsedPaymentType === 2 ? 'Installment' : 'Full');

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
                    console.log(`🚚 Restored Auto-Delivery for AI Verified Payment ID: ${payment.id}`);
                } else {
                    console.log(`No deliverable tutes found for Payment ID: ${payment.id}`);
                }
            } else {
                console.log(`Delivery already exists (maybe in another payment) for Payment ID: ${payment.id}`);
            }
        } catch (err) {
            console.error(`Auto Delivery Error for AI payment ${payment.id}:`, err);
        }

        // Also sync CRM just in case
        try {
            const { syncLeadEnrollment } = require('./controllers/paymentController');
            await syncLeadEnrollment(parseInt(payment.studentId), payment.payment_type, payment);
        } catch (e) {
            console.error("CRM Sync Error for AI payment:", e);
        }
    }
    console.log("Finished missing deliveries fix.");
}

fixMissingDeliveries().finally(() => prisma.$disconnect());
