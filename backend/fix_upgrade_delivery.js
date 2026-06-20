const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    const p = await prisma.payment.findUnique({ where: { id: 1474 } });
    if (!p) return;
    
    const delivery = await prisma.delivery.findUnique({ where: { paymentId: p.id } });
    if (delivery) {
        console.log("Delivery already exists");
        return;
    }
    
    if (p.subjects) {
        const subIds = JSON.parse(p.subjects).map(id => parseInt(id));
        const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
        
        await prisma.delivery.create({
            data: {
                paymentId: p.id,
                studentId: p.studentId.toString(),
                businessId: p.businessId,
                paymentType: p.payment_type === 1 ? 'Monthly' : (p.payment_type === 2 ? 'Installment' : 'Full'),
                status: 'Pending',
                items: { create: courses.map(c => ({ courseId: c.id, tuteName: c.name || "Tute", quantity: 1 })) }
            }
        });
        console.log("Created delivery for payment", p.id);
    }
}
fix().finally(() => prisma.$disconnect());
