const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.groupBy({
        by: ['inquiryType'],
        where: { batchId: 40 },
        _count: { id: true }
    });
    console.log(leads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
