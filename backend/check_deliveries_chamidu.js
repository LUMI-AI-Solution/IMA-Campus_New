const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const deliveries = await prisma.delivery.findMany({
        where: {
            payment: {
                student: { phone: '0714941559' }
            }
        },
        include: { payment: true, items: true }
    });
    console.log(JSON.stringify(deliveries, null, 2));
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
