const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const dups = await prisma.payment.findMany({
        where: {
            remark: { contains: '(Cleaned: 0740503229)' },
            aiVerified: true
        }
    });
    console.log(JSON.stringify(dups, null, 2));
}
test().finally(() => prisma.$disconnect());
