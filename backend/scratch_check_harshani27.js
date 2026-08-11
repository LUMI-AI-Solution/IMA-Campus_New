const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.count({
        where: { assignedTo: 49, batchId: 26, campaignType: 'AFTER_SEMINAR', inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] } }
    });
    console.log("AFTER_SEMINAR, OPEN_SEM/NORMAL in Batch 26:", leads);
    
    const leads2 = await prisma.lead.count({
        where: { assignedTo: 49, batchId: 26, campaignType: 'FREE_SEMINAR', inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] } }
    });
    console.log("FREE_SEMINAR, OPEN_SEM/NORMAL in Batch 26:", leads2);

    const leads3 = await prisma.lead.count({
        where: { assignedTo: 49, batchId: 26, campaignType: 'AFTER_SEMINAR', inquiryType: 'NEW_INQ' }
    });
    console.log("AFTER_SEMINAR, NEW_INQ in Batch 26:", leads3);
}
main().catch(console.error).finally(() => prisma.$disconnect());
