const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const pending = await prisma.delivery.findMany({
        where: { status: { in: ['Pending', 'Hold'] } },
        include: { items: true, payment: { include: { student: true } } }
    });
    
    for (let d of pending) {
        if (d.items.length >= 6) {
            console.log(`Delivery ID: ${d.id}, Student: ${d.payment?.student?.firstName}, Items: ${d.items.length}`);
            console.log(JSON.stringify(d.items, null, 2));
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
