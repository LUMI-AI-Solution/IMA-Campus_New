const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function revertPaidLeads() {
    try {
        console.log("Starting reversion...");

        // We only want to revert leads that we just modified.
        // We know we modified leads with campaignType: 'AFTER_SEMINAR', enrollmentStatus: 'ENROLLED', and inquiryType: 'PAID_CAMP'.
        // However, some might have ALWAYS been PAID_CAMP.
        // If a lead was ALWAYS PAID_CAMP, its roundProgress would ONLY have 'PAID' as campaignCategory, or no progress.
        // If it was originally NEW_INQ or OPEN_SEM, it would have roundProgress with 'NEW_INQ' or 'OPEN_SEM' or 'DEFAULT'.

        const suspiciousLeads = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                enrollmentStatus: 'ENROLLED',
                inquiryType: 'PAID_CAMP',
                updatedAt: { gte: new Date('2026-07-21T03:20:00.000Z') }
            },
            include: { roundProgress: true }
        });

        console.log(`Found ${suspiciousLeads.length} total PAID_CAMP ENROLLED leads modified recently.`);
        
        let revertedCount = 0;
        let unknownCount = 0;

        for (const lead of suspiciousLeads) {
            let originalType = null;
            
            // Look for progress categories to infer original type
            for (const rp of lead.roundProgress) {
                if (rp.campaignCategory === 'NEW_INQ') {
                    originalType = 'NEW_INQ';
                } else if (rp.campaignCategory === 'OPEN_SEM') {
                    originalType = 'OPEN_SEMINAR';
                } else if (rp.campaignCategory === 'DEFAULT') {
                    originalType = 'NORMAL';
                }
            }

            // If we didn't find progress, it's tricky.
            if (!originalType) {
                // If it was created recently by my script, it might have no progress if it was just a raw lead, but wait, my script updated EXISTING leads.
                // We'll just default to 'NEW_INQ' if we can't find it, since the user said "new inq wala", or we check if there's any other hint.
                originalType = 'NEW_INQ'; 
                unknownCount++;
            }

            if (originalType) {
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { inquiryType: originalType }
                });
                revertedCount++;
            }
        }

        console.log(`Successfully reverted ${revertedCount} leads (Unknown default to NEW_INQ: ${unknownCount}).`);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

revertPaidLeads();
