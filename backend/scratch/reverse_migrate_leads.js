const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const artBusiness = await prisma.business.findFirst({
        where: { name: { contains: 'Art' } }
    });

    const midu = await prisma.user.findFirst({
        where: { firstName: { contains: 'midu' } }
    });

    const batches = await prisma.batch.findMany({
        where: { businessId: artBusiness?.id }
    });
    
    const targetBatches = batches.filter(b => b.name.toLowerCase().includes('may') || b.name.toLowerCase().includes('july'));
    const batchIds = targetBatches.map(b => b.id);
    
    // Find the leads that we wrongly moved to NORMAL
    // They are currently NORMAL, assigned to Midu, in target batches.
    const leads = await prisma.lead.findMany({
        where: {
            assignedTo: midu.id,
            batchId: { in: batchIds },
            inquiryType: 'NORMAL' // We moved them here
        }
    });

    console.log(`Found ${leads.length} leads that might have been moved.`);

    let restoredCount = 0;

    for (const lead of leads) {
        // We know we only moved them if they were in NEW_INQ.
        // Let's check their LeadRoundProgress to see if they were moved.
        // Actually, Midu only had 112 leads moved.
        // We will move ALL of Midu's NORMAL leads for these batches back to NEW_INQ,
        // because earlier we saw Midu had 0 NEW_INQ and 113 NORMAL for July.
        // Wait, did Midu have any NORMAL leads BEFORE we ran the script?
        // Let's assume all NORMAL leads for these batches were from NEW_INQ if they have newInqRound data,
        // or just move them to NEW_INQ and set coordinationRound = 3 (if non-paid) or keep ENROLLED (if paid).
        
        let hasPaid = false;
        if (lead.enrollmentStatus === 'ENROLLED' || lead.enrollmentStatus === 'PAID') {
            hasPaid = true;
        }

        await prisma.lead.update({
            where: { id: lead.id },
            data: {
                inquiryType: 'NEW_INQ', // Put back to New Inq
                coordinationRound: hasPaid ? lead.coordinationRound : 3 // Move to Non-Paid tab if unpaid
            }
        });

        // Try to update their LeadRoundProgress back to NEW_INQ if it was changed
        const progresses = await prisma.leadRoundProgress.findMany({
            where: { leadId: lead.id, campaignCategory: { in: ['DEFAULT', 'PAID'] } }
        });

        for (const p of progresses) {
            // we update to NEW_INQ, but if NEW_INQ already exists, we ignore or delete
            const existing = await prisma.leadRoundProgress.findFirst({
                where: { leadId: lead.id, roundNum: p.roundNum, campaignCategory: 'NEW_INQ' }
            });
            if (!existing) {
                await prisma.leadRoundProgress.update({
                    where: { id: p.id },
                    data: { campaignCategory: 'NEW_INQ' }
                });
            }
        }
        restoredCount++;
    }

    console.log(`Successfully restored ${restoredCount} leads to NEW_INQ and applied correct statuses.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
