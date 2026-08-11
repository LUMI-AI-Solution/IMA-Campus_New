const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const leads = await prisma.lead.findMany({
        where: {
            inquiryType: 'OPEN_SEMINAR',
            campaignCategory: 'මාස 06න් A/L - Art', // Exact name of business 1
            batchId: 26,
            coordinationRound: 1
        }
    });
    console.log("R1 Leads for Biz 1 and Batch 26:", leads.length);

    const leads2 = await prisma.lead.findMany({
        where: {
            inquiryType: 'OPEN_SEMINAR',
            campaignCategory: 'මාස 06න් A/L - Art', // Exact name of business 1
            coordinationRound: 1
        }
    });
    console.log("R1 Leads for Biz 1 ALL BATCHES:", leads2.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
