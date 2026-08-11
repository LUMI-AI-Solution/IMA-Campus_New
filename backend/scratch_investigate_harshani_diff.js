const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const freeSemNormalCount = await prisma.lead.count({
        where: { assignedTo: 49, campaignType: 'FREE_SEMINAR', inquiryType: 'NORMAL', batchId: 26 }
    });
    console.log("Harshani's FREE_SEMINAR NORMAL leads in Batch 26:", freeSemNormalCount);
}
main().catch(console.error).finally(() => prisma.$disconnect());
