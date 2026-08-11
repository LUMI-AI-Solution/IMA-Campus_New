const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getDeliverableCoursesForPayment(payment, courses) {
    let deliverableItems = [];
    const paymentDate = payment.updatedAt || new Date();

    for (let course of courses) {
        let isDeliverable = false;

        if (payment.payment_type === 1) { // Monthly
            if (course.tuteDeliveryType === 'Monthly') {
                isDeliverable = true;
            } else if (course.tuteDeliveryType === 'One-time') {
                const existing = await prisma.deliveryItem.findFirst({
                    where: {
                        courseId: course.id,
                        delivery: { studentId: payment.studentId.toString() }
                    }
                });
                if (!existing) isDeliverable = true;
            }
        } else if (payment.payment_type === 2 || payment.payment_type === 3) {
            if (course.tuteDeliveryType === 'One-time' || course.tuteDeliveryType === 'Monthly') {
                const existing = await prisma.deliveryItem.findFirst({
                    where: {
                        courseId: course.id,
                        delivery: { studentId: payment.studentId.toString() }
                    }
                });
                if (!existing) isDeliverable = true;
            }
        }

        if (isDeliverable) {
            // Check active tutes for the course that match the payment month
            const monthNumber = paymentDate.getMonth() + 1;
            const currentYear = paymentDate.getFullYear();

            const tutes = await prisma.tute.findMany({
                where: {
                    courseId: course.id,
                    status: 1
                }
            });

            const validTutes = tutes.filter(t => {
                if (!t.publishMonth || t.publishMonth.trim() === '') return true;
                const [tYear, tMonth] = t.publishMonth.split('-');
                return parseInt(tYear) === currentYear && parseInt(tMonth) === monthNumber;
            });

            for (let tute of validTutes) {
                deliverableItems.push({
                    courseId: course.id,
                    tuteName: tute.name,
                    tuteImage: tute.image
                });
            }
        }
    }
    return deliverableItems;
}

async function main() {
    const payment = await prisma.payment.findUnique({
        where: { id: 4343 }
    });
    console.log("Payment details:", payment);
    const subIds = JSON.parse(payment.subjects).map(id => parseInt(id));
    console.log("Sub IDs:", subIds);
    const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
    console.log("Courses found:", courses.length);
    
    // I need to see the actual implementation of getDeliverableCoursesForPayment from paymentController.js
}

main().catch(console.error).finally(() => prisma.$disconnect());
