const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const status5 = await prisma.payment.findMany({
        where: { status: 5, amount: 0 },
        orderBy: { id: 'desc' }
    });
    console.log(`Found ${status5.length} status 5 zero payments`);
    if(status5.length > 0) console.log(status5.map(p => ({ id: p.id, studentId: p.studentId, amount: p.amount, method: p.method, remark: p.remark })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
