const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMissingDeliveries() {
    try {
        console.log("Finding AI Verified Payments with NO delivery...");
        
        // Find all payments that are aiVerified, status 1, and have no delivery
        const payments = await prisma.payment.findMany({
            where: {
                aiVerified: true,
                status: 1,
                delivery: null
            }
        });

        console.log(`Found ${payments.length} missing deliveries.`);

        for (const payment of payments) {
            const parsedPaymentType = payment.payment_type;
            let shouldCreateDelivery = true;

            if (parsedPaymentType === 1 && payment.groupId) {
                const ext = await prisma.delivery.findFirst({
                    where: { studentId: payment.studentId.toString(), paymentType: 'Monthly', payment: { groupId: payment.groupId } }
                });
                if (ext) shouldCreateDelivery = false;
            } else if ((parsedPaymentType === 2 || parsedPaymentType === 3) && payment.batchId) {
                const ext = await prisma.delivery.findFirst({
                    where: { studentId: payment.studentId.toString(), paymentType: { in: ['Installment', 'Full'] }, payment: { batchId: payment.batchId } }
                });
                if (ext) shouldCreateDelivery = false;
            }

            if (shouldCreateDelivery && payment.subjects) {
                try {
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
                        console.log(`🚚 Fixed: Auto-Delivery created for AI Verified Payment ID: ${payment.id}`);
                    }
                } catch(e) {
                    console.log(`Error processing payment ${payment.id}:`, e);
                }
            }
        }
        console.log("Done fixing.");
    } catch (err) {
        console.error("Error:", err);
    }
}

fixMissingDeliveries().finally(() => process.exit(0));
