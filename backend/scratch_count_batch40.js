const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leadsToUpdate = await prisma.lead.findMany({
        where: {
            batchId: 40,
            campaignType: 'AFTER_SEMINAR',
            inquiryType: 'OPEN_SEMINAR',
            coordinationRound: 3
        }
    });

    console.log(`Found ${leadsToUpdate.length} leads in Non-Enrolled (coordinationRound=3) for Batch 40 Open Seminar.`);

    // Check how many leads in batch 40 are in other rounds
    const allLeads = await prisma.lead.groupBy({
        by: ['coordinationRound'],
        where: {
            batchId: 40,
            campaignType: 'AFTER_SEMINAR',
            inquiryType: 'OPEN_SEMINAR'
        },
        _count: {
            id: true
        }
    });
    console.log("Rounds breakdown for Batch 40 Open Seminar:", JSON.stringify(allLeads, null, 2));

}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
