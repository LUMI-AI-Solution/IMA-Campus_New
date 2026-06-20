const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const p447 = await prisma.payment.findUnique({
        where: { id: 447 },
        select: { id: true, status: true, created_at: true }
    });
    console.log("P447:", p447);
    
    // Look for any logs or action timestamps for this payment if available
    const logs = await prisma.paymentLog?.findMany({ where: { paymentId: 447 } }).catch(() => "No logs table");
    console.log("Logs:", logs);
}
check().catch(console.error).finally(() => prisma.$disconnect());
