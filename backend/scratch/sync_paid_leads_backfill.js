const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// We can just fetch all ENROLLED leads in NEW_INQ, find their phone numbers, and create PAID_CAMP leads for them.

async function backfillPaidLeads() {
    try {
        console.log("Starting backfill for PAID_CAMP leads...");

        // 1. Find all NEW_INQ / OPEN_SEMINAR / NORMAL leads that are ENROLLED
        const enrolledInquiryLeads = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                enrollmentStatus: 'ENROLLED',
                inquiryType: {
                    in: ['NEW_INQ', 'OPEN_SEMINAR', 'NORMAL']
                }
            }
        });

        console.log(`Found ${enrolledInquiryLeads.length} enrolled inquiry leads. Checking for missing PAID_CAMP leads...`);

        let createdCount = 0;

        for (const lead of enrolledInquiryLeads) {
            // Check if a PAID_CAMP lead exists with the same phone base (last 9 digits)
            const basePhone = lead.phone.replace(/[^0-9]/g, '').slice(-9);
            
            // To be safe, we just check if any PAID_CAMP lead contains this basePhone
            const existingPaidLead = await prisma.lead.findFirst({
                where: {
                    inquiryType: 'PAID_CAMP',
                    phone: { contains: basePhone }
                }
            });

            if (!existingPaidLead) {
                // If it doesn't exist, we should create it.
                // Normally paymentController handles this, but here we synthesize a phone number.
                // In paymentController: dbPhoneSuffix = `_BIZ_${businessId}_BATCH_${batchId}_PAID`
                // Let's assume businessId=1 and batchId is from the lead.
                
                const businessId = 1;
                const batchId = lead.batchId || 26; // Default to 26 if not set
                const newPhone = `${lead.phone.replace(/[^0-9]/g, '')}_BIZ_${businessId}_BATCH_${batchId}_PAID`;

                // Double check exact phone
                const checkExact = await prisma.lead.findUnique({ where: { phone: newPhone } });
                
                if (!checkExact) {
                    await prisma.lead.create({
                        data: {
                            name: lead.name,
                            phone: newPhone,
                            source: 'system_backfill',
                            campaignType: 'AFTER_SEMINAR',
                            inquiryType: 'PAID_CAMP',
                            enrollmentStatus: 'ENROLLED',
                            paymentIntention: lead.paymentIntention || 'MONTHLY',
                            assignedTo: null,
                            batchId: batchId,
                            coordinationRound: 1,
                            phase: 1,
                            callStatus: 'pending'
                        }
                    });
                    createdCount++;
                }
            }
        }

        console.log(`Successfully created ${createdCount} missing PAID_CAMP leads.`);

    } catch (error) {
        console.error("Error backfilling PAID_CAMP leads:", error);
    } finally {
        await prisma.$disconnect();
    }
}

backfillPaidLeads();
