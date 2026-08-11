const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const student = await prisma.user.findFirst({ where: { phone: { contains: '742746667' } } });
    if(student) {
        console.log("Student:", student.id, student.phone);
        const payments = await prisma.payment.findMany({ where: { studentId: student.id } });
        console.log("Payments count:", payments.length);
    } else {
        console.log("Student not found");
    }
}
run().catch(console.log).finally(() => prisma.$disconnect());
