const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const payment = await prisma.payment.findUnique({
        where: { id: 4343 }
    });
    
    if (!payment) {
        console.log("Payment not found");
        return;
    }

    const ext = await prisma.delivery.findUnique({
        where: { paymentId: payment.id }
    });
    
    if (ext) {
        console.log("Delivery already exists");
        return;
    }

    let subIds = JSON.parse(payment.subjects).map(id => parseInt(id));
    const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
    
    const deliverableCoursesMap = new Map();

    for (const course of courses) {
        let deliverTute = false;
        let tuteName = course.name || "Tute";
        let tuteImage = null;

        if (course.groupPrices && payment.groupId) {
            try {
                const gps = JSON.parse(course.groupPrices);
                const match = gps.find(g => g.groupId == payment.groupId);
                if (match) {
                    if (match.deliverTute === true || match.deliverTute === 'true') {
                        deliverTute = true;
                        if (match.tuteName && match.tuteName.trim()) {
                            tuteName = match.tuteName.trim();
                        }
                        if (match.tuteCover && match.tuteCover.trim()) {
                            tuteImage = match.tuteCover.trim();
                        }
                    }
                }
            } catch (e) { }
        }

        if (deliverTute) {
            const key = `${course.id}_${tuteName}`;
            if (!deliverableCoursesMap.has(key)) {
                deliverableCoursesMap.set(key, { courseId: course.id, tuteName: tuteName, tuteImage: typeof tuteImage !== 'undefined' ? tuteImage : null, quantity: 1 });
            }
        }
    }

    const itemsToCreate = Array.from(deliverableCoursesMap.values());
    
    if (itemsToCreate.length > 0) {
        const paymentTypeStr = payment.payment_type === 1 ? 'Monthly' : (payment.payment_type === 2 ? 'Installment' : 'Full');
        
        await prisma.delivery.create({
            data: {
                paymentId: payment.id,
                studentId: payment.studentId.toString(),
                businessId: payment.businessId,
                paymentType: paymentTypeStr,
                status: 'Pending',
                items: { create: itemsToCreate }
            }
        });
        
        console.log(`Created delivery for payment ${payment.id} with ${itemsToCreate.length} items.`);
    } else {
        console.log("No items to deliver");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
