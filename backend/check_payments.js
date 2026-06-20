const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPayments() {
    try {
        const studentId = 700; // From my previous query
        const payments = await prisma.payment.findMany({
            where: { studentId: studentId }
        });
        console.log("Payments:", JSON.stringify(payments, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkPayments();
