const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const counts = await prisma.lead.groupBy({
        by: ['inquiryType', 'campaignType'],
        where: { assignedTo: 49, batchId: 26 },
        _count: { id: true }
    });
    console.log("=== HARSHANI'S BATCH 26 LEADS ===");
    console.log(counts);
}
main().catch(console.error).finally(() => prisma.$disconnect());
