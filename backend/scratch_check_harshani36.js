const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // count by date created for Harshani in batch 26
    const counts = await prisma.lead.groupBy({
        by: ['createdAt'],
        where: { assignedTo: 49, batchId: 26 },
        _count: { id: true }
    });
    console.log("Leads created per timestamp for Harshani in batch 26:");
    console.log(counts.filter(c => c._count.id > 10)); // see bulk imports
}
main().catch(console.error).finally(() => prisma.$disconnect());
