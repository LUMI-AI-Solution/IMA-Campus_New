const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.groupBy({
        by: ['callStatus', 'coordinationRound'],
        where: { assignedTo: 49, batchId: 26, campaignType: 'AFTER_SEMINAR', inquiryType: 'NEW_INQ' },
        _count: { id: true }
    });
    console.log("Harshani's NEW_INQ leads statuses:", leads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
