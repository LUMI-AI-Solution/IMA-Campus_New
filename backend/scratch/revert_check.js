const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const startTime = new Date('2026-07-21T13:26:00Z');
    const endTime = new Date('2026-07-21T13:30:00Z');

    const updatedPayments = await prisma.payment.findMany({
        where: {
            updatedAt: {
                gte: startTime,
                lte: endTime
            },
            payment_type: 1,
            group: { type: 1 }
        },
        include: { business: true, group: true }
    });

    console.log(`Found ${updatedPayments.length} payments updated in that window.`);
    
    for (const p of updatedPayments) {
        if (!p.business.name.includes("Online School")) {
            console.log(`Need to revert: ID ${p.id}, Business: ${p.business.name}, Amount: ${p.amount}`);
            // Let's assume they were payment_type = 3
            await prisma.payment.update({
                where: { id: p.id },
                data: { payment_type: 3 }
            });
        }
    }
    console.log("Revert complete.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
