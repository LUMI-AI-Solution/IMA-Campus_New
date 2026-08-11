const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const invalidPayments = await prisma.payment.findMany({
        where: {
            payment_type: { in: [2, 3] },
            group: {
                type: 1
            }
        }
    });

    console.log(`Found ${invalidPayments.length} invalid payments where payment_type is Full/Installment but group is Monthly.`);

    let count = 0;
    for (const payment of invalidPayments) {
        await prisma.payment.update({
            where: { id: payment.id },
            data: { payment_type: 1 }
        });
        count++;
    }
    
    console.log(`Successfully fixed ${count} payments.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
