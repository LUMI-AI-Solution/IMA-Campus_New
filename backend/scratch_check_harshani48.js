const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // This is basically what /after-seminar-crm/stats/open-seminar does for staff breakdown
    const leads = await prisma.lead.groupBy({
        by: ['assignedTo'],
        where: { batchId: 26, campaignType: 'AFTER_SEMINAR', inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] } },
        _count: { id: true }
    });
    console.log("AFTER_SEMINAR OPEN/NORMAL in Batch 26:");
    console.log(leads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
