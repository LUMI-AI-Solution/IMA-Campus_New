const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const deleted = await prisma.payment.deleteMany({
        where: {
            amount: 0,
            status: 0,
            remark: { contains: '[UPGRADE]' }
        }
    });
    console.log(`Deleted ${deleted.count} payments`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
