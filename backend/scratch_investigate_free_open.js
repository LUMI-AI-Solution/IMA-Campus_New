const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.count({
        where: { assignedTo: 49, campaignType: 'FREE_SEMINAR', inquiryType: 'OPEN_SEMINAR' }
    });
    console.log("Harshani's FREE_SEMINAR | OPEN_SEMINAR leads:", leads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
