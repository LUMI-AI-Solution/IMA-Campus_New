const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const counts = await prisma.lead.count({
        where: { batchId: 26, campaignType: 'AFTER_SEMINAR', inquiryType: 'NORMAL', assignedTo: null }
    });
    console.log("Unassigned AFTER_SEMINAR NORMAL leads in Batch 26:", counts);
}
main().catch(console.error).finally(() => prisma.$disconnect());
