const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.count({
        where: { assignedTo: 49, campaignType: 'AFTER_SEMINAR', inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] } }
    });
    console.log(`Leads for Harshani (AFTER_SEMINAR, OPEN_SEM/NORMAL) across all batches: ${leads}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
