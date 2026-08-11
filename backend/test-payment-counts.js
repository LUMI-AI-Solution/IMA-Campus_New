const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const c = await prisma.payment.count({
            where: { status: 0, method: 'BANK_TRANSFER' }
        });
        console.log("Count of status=0, method=BANK_TRANSFER:", c);
        
        const allStatus = await prisma.payment.groupBy({
            by: ['status', 'method'],
            _count: true
        });
        console.log("Group by status and method:");
        console.log(allStatus);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
