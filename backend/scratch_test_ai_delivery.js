const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDeliveryLogic() {
    try {
        const payment = await prisma.payment.findUnique({ where: { id: 2905 } });
        console.log("Found payment:", payment.id);

        const parsedPaymentType = payment.payment_type;
        let shouldCreateDelivery = true;

        if (payment.subjects) {
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
            console.log("Deliverable courses:", deliverableCourses);

            if (deliverableCourses.length > 0) {
                const paymentTypeStr = parsedPaymentType === 1 ? 'Monthly' : (parsedPaymentType === 2 ? 'Installment' : 'Full');

                const createdDelivery = await prisma.delivery.create({
                    data: {
                        paymentId: payment.id,
                        studentId: payment.studentId.toString(),
                        businessId: payment.businessId,
                        paymentType: paymentTypeStr,
                        status: 'Pending', 
                        items: { create: deliverableCourses }
                    }
                });
                console.log(`🚚 Auto-Delivery created for AI Verified Payment ID: ${payment.id}`, createdDelivery);
            } else {
                console.log("No deliverable courses found!");
            }
        }
    } catch (err) {
        console.error("Auto Delivery Error:", err);
    }
}

testDeliveryLogic().finally(() => process.exit(0));
