const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.count({
        where: { assignedTo: 49, campaignType: { in: ['AFTER_SEMINAR', 'FREE_SEMINAR'] }, batchId: 26, inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] } }
    });
    console.log(`Leads for Harshani in batch 26 (AFTER/FREE_SEMINAR, OPEN_SEM/NORMAL): ${leads}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
