const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const methods = await prisma.payment.groupBy({
        by: ['method'],
        _count: {
            method: true
        }
    });
    console.log("Distinct Methods:", methods);
    
    // Get a few recent payments to see what slip_image and remark look like
    const recent = await prisma.payment.findMany({
        take: 10,
        orderBy: { id: 'desc' },
        select: { method: true, slip_image: true, remark: true }
    });
    console.log("\nRecent Payments:", recent);
}
main().finally(() => prisma.$disconnect());
