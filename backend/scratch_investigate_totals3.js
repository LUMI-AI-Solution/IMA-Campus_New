const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const total = await prisma.lead.count({
        where: { batchId: 26, campaignType: 'AFTER_SEMINAR', inquiryType: 'NORMAL' }
    });
    console.log("Total AFTER_SEMINAR | NORMAL leads in Batch 26:", total);
}
main().catch(console.error).finally(() => prisma.$disconnect());
