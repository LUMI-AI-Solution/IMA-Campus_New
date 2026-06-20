const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    // 1. Check all upgraded payments that are approved
    const upgradedPayments = await prisma.payment.findMany({
        where: {
            remark: { contains: '[UPGRADE]' },
            status: 1
        }
    });
    
    console.log(`Found ${upgradedPayments.length} approved upgraded payments.`);
    
    let missingDeliveries = 0;
    for (const p of upgradedPayments) {
        const d = await prisma.delivery.findUnique({ where: { paymentId: p.id } });
        if (!d && p.subjects) {
            missingDeliveries++;
            const subIds = JSON.parse(p.subjects).map(id => parseInt(id));
            const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
            if (courses.length > 0) {
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
            }
        }
    }
    console.log(`Fixed ${missingDeliveries} missing deliveries for upgraded payments.\n`);
    
    // 2. Check leads for 714941559
    const leads = await prisma.lead.findMany({
        where: { phone: { contains: '714941559' } }
    });
    console.log(`Found ${leads.length} leads for 714941559:`);
    leads.forEach(l => {
        console.log(`- ID: ${l.id}, Campaign: ${l.campaignType}, Inquiry: ${l.inquiryType}, EnrollStatus: ${l.enrollmentStatus}, AssignedTo: ${l.assignedTo}, Phone: ${l.phone}`);
    });
}
check().finally(() => prisma.$disconnect());
