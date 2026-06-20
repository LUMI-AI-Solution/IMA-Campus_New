const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const financeStaff = await prisma.user.findMany({
        where: { department: 'Finance' },
        select: { id: true, firstName: true, role: true, department: true, businessType: true }
    });
    console.log("Finance Staff:", financeStaff);
    
    // Also check people with role = 'PAYMENT_MANAGER' or similar?
    const paymentRoles = await prisma.user.findMany({
        where: { role: { contains: 'PAY' } },
        select: { id: true, firstName: true, role: true, department: true }
    });
    console.log("Payment Roles:", paymentRoles);
    await prisma.$disconnect();
}
run();
