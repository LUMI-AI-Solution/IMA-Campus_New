const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const todayStart = new Date();
    todayStart.setUTCHours(0,0,0,0);
    const payments = await prisma.payment.findMany({
        where: {
            updatedAt: { gte: todayStart },
            status: { in: ['Verified', 'AI_Verified', 'Pending_Delivery'] } // Not sure exact status
        },
        include: {
            Student: {
                select: { id: true, name: true, phone: true }
            },
            Batch: {
                select: { id: true, name: true }
            }
        }
    });
    console.log(payments.map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        batch: p.Batch?.name,
        updatedAt: p.updatedAt
    })).slice(0, 10)); // Just a sample
}
run().finally(() => process.exit());
