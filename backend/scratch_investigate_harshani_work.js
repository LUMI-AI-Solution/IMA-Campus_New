const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Check if she did work on FREE_SEMINAR leads (assigned to her)
    const freeWork = await prisma.lead.count({
        where: { assignedTo: 49, batchId: 26, campaignType: 'FREE_SEMINAR', callStatus: { not: 'pending' } }
    });
    console.log("Harshani's worked FREE_SEMINAR leads:", freeWork);

    // Check if she did work on NEW_INQ leads (assigned to her)
    const newInqWork = await prisma.lead.count({
        where: { assignedTo: 49, batchId: 26, campaignType: 'AFTER_SEMINAR', inquiryType: 'NEW_INQ', callStatus: { not: 'pending' } }
    });
    console.log("Harshani's worked NEW_INQ leads:", newInqWork);
    
    // Check if the OPEN_SEMINAR leads currently assigned to Raveesha/Kavishka were worked on
    const openSemWorkedByOthers = await prisma.lead.groupBy({
        by: ['assignedTo', 'callStatus'],
        where: { batchId: 26, campaignType: 'AFTER_SEMINAR', inquiryType: 'OPEN_SEMINAR', assignedTo: { in: [35, 48] } },
        _count: { id: true }
    });
    console.log("\nRaveesha (35) and Kavishka (48) Open Sem leads by call status:");
    console.log(openSemWorkedByOthers);
}
main().catch(console.error).finally(() => prisma.$disconnect());
