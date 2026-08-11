const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getDeliverableCoursesForPayment = async (payment, courses) => {
    const deliverableCoursesMap = new Map();
    const parsedPType = parseInt(payment.payment_type);

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

    return Array.from(deliverableCoursesMap.values());
};

async function main() {
    const payment = await prisma.payment.findUnique({
        where: { id: 4343 }
    });
    
    if (payment.subjects) {
        const subIds = JSON.parse(payment.subjects).map(id => parseInt(id));
        const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
        
        const items = await getDeliverableCoursesForPayment(payment, courses);
        console.log("Deliverable items:", items);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
