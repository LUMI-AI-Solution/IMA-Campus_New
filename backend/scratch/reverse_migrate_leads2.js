const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const artBusiness = await prisma.business.findFirst({
        where: { name: { contains: 'Art' } }
    });

    const miduId = 33; // Explicitly use ID 33

    const batches = await prisma.batch.findMany({
        where: { businessId: artBusiness?.id }
    });
    
    const targetBatches = batches.filter(b => b.name.toLowerCase().includes('may') || b.name.toLowerCase().includes('july'));
    const batchIds = targetBatches.map(b => b.id);
    
    // Find the leads that we wrongly moved to NORMAL
    // They are currently NORMAL, assigned to Midu, in target batches.
    const leads = await prisma.lead.findMany({
        where: {
            assignedTo: miduId,
            batchId: { in: batchIds },
            inquiryType: 'NORMAL' // We moved them here
        }
    });

    console.log(`Found ${leads.length} NORMAL leads that might have been moved for Midu 33.`);

    let restoredCount = 0;

    for (const lead of leads) {
        
        let hasPaid = false;
        // Check if there is a payment
        const student = await prisma.user.findFirst({
            where: { phone: lead.phone, role: 'STUDENT' }
        });

        if (student && lead.batchId) {
            const payments = await prisma.payment.findMany({
                where: { 
                    studentId: student.id, 
                    batchId: lead.batchId, 
                    status: { in: [1, 4] } 
                }
            });
            if (payments.length > 0) hasPaid = true;
        }

        await prisma.lead.update({
            where: { id: lead.id },
            data: {
                inquiryType: 'NEW_INQ', // Put back to New Inq
                enrollmentStatus: hasPaid ? 'ENROLLED' : 'NON_ENROLLED',
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
            } else {
                await prisma.leadRoundProgress.delete({ where: { id: p.id } });
            }
        }
        restoredCount++;
    }

    console.log(`Successfully restored ${restoredCount} leads to NEW_INQ and applied correct statuses.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
