const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Reverting all auto-expired Monthly Payments (status 3) back to status 1...");
    const updated = await prisma.payment.updateMany({
        where: {
            status: 3,
            payment_type: 1
        },
        data: {
            status: 1
        }
    });
    console.log(`Successfully reverted ${updated.count} expired payments back to normal access!`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
