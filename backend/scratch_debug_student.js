const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const student = await prisma.user.findFirst({ where: { phone: { contains: '94742746667' }, role: 'Student' } });
    if(student) {
        console.log("Student:", student.id);
        const payments = await prisma.payment.findMany({ where: { studentId: student.id } });
        console.log("Payments:", payments.map(p => ({
            id: p.id, status: p.status, type: p.payment_type, group: p.groupId, date: p.created_at
        })));
    } else {
        console.log("Student not found for phone 94742746667");
    }
}
run().catch(console.log).finally(() => prisma.$disconnect());
