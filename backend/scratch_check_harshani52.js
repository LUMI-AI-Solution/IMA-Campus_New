const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const counts = await prisma.lead.groupBy({
        by: ['assignedTo', 'campaignType'],
        where: { assignedTo: { in: [49, 137, 323, 337, 1118, 1645, 3046] }, batchId: 26 },
        _count: { id: true }
    });
    console.log(counts);
}
main().catch(console.error).finally(() => prisma.$disconnect());
