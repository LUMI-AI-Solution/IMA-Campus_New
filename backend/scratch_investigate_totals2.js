const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const total = await prisma.lead.count({
        where: { batchId: 26, campaignType: 'AFTER_SEMINAR', inquiryType: 'OPEN_SEMINAR', assignedTo: null }
    });
    console.log("Unassigned AFTER_SEMINAR | OPEN_SEMINAR leads in Batch 26:", total);
}
main().catch(console.error).finally(() => prisma.$disconnect());
