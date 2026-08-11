const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const counts = await prisma.lead.groupBy({
        by: ['campaignType', 'batchId'],
        where: { assignedTo: 49 },
        _count: { id: true }
    });
    console.log("Harshani leads by campaign and batch:", counts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
