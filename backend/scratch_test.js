const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const txns = await prisma.bankTransaction.findMany({
            where: { statementMonth: "May:1" },
            orderBy: { id: 'asc' },
            take: 500,
            include: { payment: { select: { id: true, amount: true, student: { select: { firstName: true, phone: true } } } } }
        });
        console.log("Success", txns);
    } catch (e) {
        console.error("Error", e);
    } finally {
        await prisma.$disconnect();
    }
}
test();
