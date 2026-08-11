const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const normalWork = await prisma.lead.count({
        where: { assignedTo: 49, campaignType: 'AFTER_SEMINAR', inquiryType: 'NORMAL', callStatus: { not: 'pending' } }
    });
    console.log("Harshani's worked AFTER_SEMINAR NORMAL leads:", normalWork);
}
main().catch(console.error).finally(() => prisma.$disconnect());
