const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const pMonth = await prisma.payment.count({
        where: { payment_type: 1, status: 1 }
    });
    console.log("Total Monthly Payments:", pMonth);
    
    // Check if a normal monthly payment generates a delivery
    const dMonth = await prisma.delivery.count({
        where: { paymentType: 'Monthly' }
    });
    console.log("Total Monthly Deliveries:", dMonth);
}
check().catch(console.error).finally(() => prisma.$disconnect());
