const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.count({
        where: { assignedTo: null, batchId: 26, campaignType: 'AFTER_SEMINAR', inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] } }
    });
    console.log("Unassigned AFTER_SEMINAR OPEN_SEM leads for Batch 26:", leads);
    
    const leads2 = await prisma.lead.count({
        where: { assignedTo: null, batchId: 26, campaignType: 'FREE_SEMINAR', inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] } }
    });
    console.log("Unassigned FREE_SEMINAR OPEN_SEM leads for Batch 26:", leads2);
}
main().catch(console.error).finally(() => prisma.$disconnect());
