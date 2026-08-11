const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const counts = await prisma.lead.groupBy({
        by: ['campaignType', 'inquiryType'],
        where: { assignedTo: 49 },
        _count: { id: true }
    });
    console.log(counts);
}
main().catch(console.error).finally(() => prisma.$disconnect());
