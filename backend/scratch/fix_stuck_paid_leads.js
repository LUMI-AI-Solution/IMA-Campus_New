const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixStuckPaidLeads() {
    try {
        console.log("Starting to fix stuck paid leads...");

        // Find all leads in AFTER_SEMINAR that are ENROLLED but not in PAID_CAMP
        const stuckLeads = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                enrollmentStatus: 'ENROLLED',
                inquiryType: {
                    in: ['NEW_INQ', 'OPEN_SEMINAR', 'NORMAL']
                }
            },
            select: { id: true, phone: true, name: true, inquiryType: true }
        });

        console.log(`Found ${stuckLeads.length} stuck paid leads.`);

        if (stuckLeads.length > 0) {
            const result = await prisma.lead.updateMany({
                where: {
                    id: { in: stuckLeads.map(l => l.id) }
                },
                data: {
                    inquiryType: 'PAID_CAMP'
                }
            });

            console.log(`Successfully updated ${result.count} leads to PAID_CAMP.`);
        } else {
            console.log("No leads to fix.");
        }

    } catch (error) {
        console.error("Error fixing leads:", error);
    } finally {
        await prisma.$disconnect();
    }
}

fixStuckPaidLeads();
