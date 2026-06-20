const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function fix() {
    try {
        await prisma.payment.update({
            where: { id: 1549 },
            data: { status: 2 } // Reject
        });
        console.log("Rejected fake upgrade payment 1549");
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
fix();
