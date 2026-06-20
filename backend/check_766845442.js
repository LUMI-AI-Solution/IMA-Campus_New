const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const student = await prisma.user.findFirst({
        where: { phone: { contains: '766845442' } }
    });
    
    if (!student) {
        console.log("Student not found!");
        return;
    }

    const payments = await prisma.payment.findMany({
        where: { studentId: student.id },
        select: { id: true, amount: true, method: true, status: true, slip_image: true, created_at: true, payment_type: true, subjects: true }
    });

    console.log(`Student ID: ${student.id}, Name: ${student.first_name} ${student.last_name}`);
    console.log("Payments:", payments);
}
check().catch(console.error).finally(() => prisma.$disconnect());
