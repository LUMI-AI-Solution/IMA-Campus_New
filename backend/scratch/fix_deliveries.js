const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Finding deliveries with 0 items...");
        
        // Find deliveries with no items
        const emptyDeliveries = await prisma.delivery.findMany({
            where: {
                items: { none: {} }
            }
        });
        
        console.log(`Found ${emptyDeliveries.length} empty deliveries.`);
        
        if (emptyDeliveries.length > 0) {
            console.log("Deleting empty deliveries...");
            await prisma.delivery.deleteMany({
                where: { id: { in: emptyDeliveries.map(d => d.id) } }
            });
            console.log("Deleted.");
        }

        console.log("Fetching AI verified payments that are NOT in deliveries...");
        const payments = await prisma.payment.findMany({
            where: {
                aiVerified: true,
                status: 1,
                delivery: null
            },
            include: {
                student: true
            }
        });

        console.log(`Found ${payments.length} AI verified payments without delivery.`);

        let successCount = 0;
        for (const payment of payments) {
            let shouldCreateDelivery = true;
            if (payment.payment_type === 2 || payment.payment_type === 3) {
                if (payment.batchId) {
                    const ext = await prisma.delivery.findFirst({
                        where: { studentId: String(payment.studentId), paymentType: { in: ['Installment', 'Full'] }, payment: { batchId: payment.batchId } }
                    });
                    if (ext) shouldCreateDelivery = false;
                }
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
                            deliverableCoursesMap.set(tuteName, {
                                courseId: course.id,
                                tuteName: tuteName,
                                tuteImage: course.thumbnail || null,
                                quantity: 1
                            });
                        }
                    }
                    const deliverableCourses = Array.from(deliverableCoursesMap.values());

                    if (deliverableCourses.length > 0) {
                        const paymentTypeStr = parseInt(payment.payment_type) === 1 ? 'Monthly' : (parseInt(payment.payment_type) === 2 ? 'Installment' : 'Full');
                        await prisma.delivery.create({
                            data: {
                                paymentId: payment.id, 
                                studentId: String(payment.studentId), 
                                businessId: payment.businessId || 1,
                                paymentType: paymentTypeStr, 
                                status: 'Pending',
                                items: { create: deliverableCourses }
                            }
                        });
                        successCount++;
                        console.log(`Created delivery with items for Payment ID: ${payment.id}`);
                    } else {
                        console.log(`Payment ID ${payment.id} has no deliverable subjects. Skipping.`);
                    }
                } catch (e) {
                    console.error(`Failed to parse subjects for Payment ID ${payment.id}`);
                }
            }
        }
        
        console.log(`\nSuccessfully created ${successCount} complete deliveries.`);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
