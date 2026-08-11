const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const students = await prisma.user.findMany({
        where: { phone: { contains: '705034939' } },
        select: { id: true, phone: true, whatsapp: true }
    });
    console.log("Found students:", students);

    if (students.length > 0) {
        const payments = await prisma.payment.findMany({
            where: { studentId: students[0].id },
            select: { id: true, batchId: true, status: true, amount: true, created_at: true }
        });
        console.log("Payments for student:", payments);
    }
    process.exit(0);
}
run().catch(console.error);
