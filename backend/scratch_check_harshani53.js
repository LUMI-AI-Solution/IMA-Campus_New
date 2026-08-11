const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const counts = await prisma.lead.groupBy({
        by: ['batchId', 'campaignType', 'assignedTo'],
        _count: { id: true }
    });
    console.log("Groups with exactly 81 leads:");
    console.log(counts.filter(c => c._count.id === 81));
}
main().catch(console.error).finally(() => prisma.$disconnect());
