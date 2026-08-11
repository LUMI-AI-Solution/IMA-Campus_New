const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.count({
        where: { assignedTo: 49, batchId: 26, campaignType: 'AFTER_SEMINAR', coordinationRound: 2 }
    });
    console.log("Harshani's AFTER_SEMINAR leads in Round 2:", leads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
