const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.groupBy({
        by: ['campaignType'],
        where: { assignedTo: 49 },
        _count: { id: true }
    });
    console.log("Campaign types for Harshani:", leads);
}

main().catch(console.error).finally(() => prisma.$disconnect());
