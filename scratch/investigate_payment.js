const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log("=== USER PROFILES ===");
    const users = await prisma.user.findMany({
        where: {
            phone: { in: ['0788292502', '0788292505', '788292502', '788292505'] }
        }
    });
    console.log(JSON.stringify(users, null, 2));

    console.log("\n=== PAYMENTS FOR THESE USERS AND PHONES ===");
    const payments = await prisma.payment.findMany({
        where: {
            OR: [
                { student: { phone: { in: ['0788292502', '0788292505', '788292502', '788292505'] } } },
                { remark: { contains: '0788292502' } },
                { remark: { contains: '0788292505' } }
            ]
        },
        include: {
            student: {
                select: { id: true, firstName: true, lastName: true, phone: true }
            },
            bankTransactions: true
        }
    });
    console.log(JSON.stringify(payments, null, 2));

    console.log("\n=== BANK TRANSACTIONS MATCHING PATTERN ===");
    const txns = await prisma.bankTransaction.findMany({
        where: {
            OR: [
                { description: { contains: '0788292502' } },
                { description: { contains: '0788292505' } }
            ]
        }
    });
    console.log(JSON.stringify(txns, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
