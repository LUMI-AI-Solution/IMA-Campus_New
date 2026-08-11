const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const controller = require('./controllers/afterSeminarInquiryController');

async function main() {
    // Instead of using node-mocks-http, let's just use Prisma directly to see what the exact whereClause would fetch.
    const whereClause = {
        campaignType: 'AFTER_SEMINAR',
        source: { not: 'system' },
        assignedTo: 49,
        inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] }
    };
    
    // Add business/batch filters if applicable
    // From the user's screenshot, it says "2027 July Intake - කලා අංශය". 
    // It seems a batch filter is selected. Let's see if batchId is the issue!
    const leads = await prisma.lead.findMany({
        where: whereClause
    });
    
    console.log("Total matched leads for assignedTo=49 and inquiryType in [OPEN_SEMINAR, NORMAL] AND campaignType=AFTER_SEMINAR:", leads.length);
    
    if (leads.length === 0) {
        // Let's check without campaignType
        const leadsAnyCampaign = await prisma.lead.findMany({
            where: {
                assignedTo: 49,
                inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] }
            }
        });
        console.log("Leads without campaignType filter:", leadsAnyCampaign.length);
        if (leadsAnyCampaign.length > 0) {
            console.log("Ah! Campaign type is:", leadsAnyCampaign[0].campaignType);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
