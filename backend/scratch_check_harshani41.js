const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const counts = await prisma.lead.groupBy({
        by: ['assignedTo'],
        where: { batchId: 26, campaignType: 'FREE_SEMINAR' },
        _count: { id: true }
    });
    console.log(counts);
}
main().catch(console.error).finally(() => prisma.$disconnect());
