const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDeliveryLogic() {
    const updatedPayment = await prisma.payment.findUnique({ where: { id: 1970 } });
    
    let shouldCreateDelivery = true;
    if (updatedPayment.payment_type === 1) {
        if (updatedPayment.groupId) {
            const ext = await prisma.delivery.findFirst({
                where: { studentId: updatedPayment.studentId.toString(), paymentType: 'Monthly', payment: { groupId: updatedPayment.groupId } }
            });
            if (ext) {
                console.log("ext found! skipping");
                shouldCreateDelivery = false;
            } else {
                console.log("No ext found. Proceeding...");
            }
        }
    }

    if (shouldCreateDelivery && updatedPayment.subjects) {
        try {
            const subIds = JSON.parse(updatedPayment.subjects).map(id => parseInt(id));
            const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
            
            const deliverableCoursesMap = new Map();
            for (const course of courses) {
                let deliverTute = false;
                let tuteName = course.name || "Tute";

                if (course.groupPrices && updatedPayment.groupId) {
                    try {
                        const gps = JSON.parse(course.groupPrices);
                        const match = gps.find(g => g.groupId == updatedPayment.groupId);
                        if (match && (match.deliverTute === true || match.deliverTute === 'true')) {
                            deliverTute = true;
                            if (match.tuteName) tuteName = match.tuteName;
                        }
                    } catch(e) {}
                }

                if (deliverTute && !deliverableCoursesMap.has(tuteName)) {
                    deliverableCoursesMap.set(tuteName, {
                        courseId: course.id,
                        tuteName: tuteName,
                        quantity: 1
                    });
                }
            }
            const deliverableCourses = Array.from(deliverableCoursesMap.values());

            console.log("Deliverable courses:", deliverableCourses);

            if (deliverableCourses.length > 0) {
                console.log("Would create delivery with items:", deliverableCourses);
            } else {
                console.log("No deliverable courses found!");
            }
        } catch (e) { 
            console.log("Error:", e);
        }
    }
}
testDeliveryLogic().catch(console.error).finally(() => prisma.$disconnect());
