const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ithiniDeliveries = await prisma.delivery.findMany({
        where: { payment: { student: { firstName: { contains: 'Ithini' } } }, status: 'Pending' },
        include: { items: true, payment: { include: { student: true } } }
    });
    
    console.log(JSON.stringify(ithiniDeliveries, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
