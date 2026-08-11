const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.groupBy({
        by: ['inquiryType'],
        where: { assignedTo: 49, campaignType: 'AFTER_SEMINAR' },
        _count: { id: true }
    });
    console.log("Inquiry types for Harshani's AFTER_SEMINAR leads:", leads);
    
    // Check if any of them belong to a batch that is currently selected?
    // Wait, the screenshot shows a batch is selected: "2027 July Intake - කලා අංශය".
    // Let's find out the batch ID for that.
    const batch = await prisma.batch.findFirst({
        where: { name: { contains: '2027 July Intake' } }
    });
    console.log("Batch:", batch);
    
    if (batch) {
        const batchLeads = await prisma.lead.count({
            where: { assignedTo: 49, batchId: batch.id }
        });
        console.log(`Leads for Harshani in batch ${batch.id}: ${batchLeads}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
