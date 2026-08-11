const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.groupBy({
        by: ['inquiryType'],
        where: { assignedTo: 49, batchId: 26, campaignType: 'AFTER_SEMINAR', coordinationRound: 2 },
        _count: { id: true }
    });
    console.log("Harshani's Round 2 leads inquiryType:", leads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
