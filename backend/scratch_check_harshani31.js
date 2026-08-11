const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const counts = await prisma.lead.groupBy({
        by: ['assignedTo'],
        where: { batchId: 26 },
        _count: { id: true }
    });
    console.log("Total leads per user in Batch 26:");
    console.log(counts.filter(c => c._count.id > 50 && c._count.id < 100)); // filtering for around 81
}
main().catch(console.error).finally(() => prisma.$disconnect());
