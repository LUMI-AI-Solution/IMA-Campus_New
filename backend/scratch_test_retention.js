const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const afterSeminarRetentionController = require('./controllers/afterSeminarRetentionController');

async function run() {
    // We will call getRetentionCampaignData using a mock request
    const req = {
        query: {
            businessId: '6', // 2027 මැයි - වාණිජ කණ්ඩායම is business 6
            batchId: '12',   // assuming batch 12, I should check this
            targetMonthName: 'MAY'
        }
    };
    const res = {
        status: () => res,
        json: (data) => {
            const lead = data.leads.find(l => l.phone.includes('773114092'));
            if (lead) {
                console.log("Found Lead!", lead.phone);
                console.log("enrollmentStatus:", lead.enrollmentStatus);
                console.log("paymentHistory:", JSON.stringify(lead.paymentHistory, null, 2));
            } else {
                console.log("Lead not found in API response");
            }
        }
    };
    
    // First, let's find the batch ID for "2027 මැයි - වාණිජ කණ්ඩායම"
    const batch = await prisma.batch.findFirst({
        where: { name: { contains: '2027 මැයි - වාණිජ කණ්ඩායම' } }
    });
    if (batch) {
        req.query.batchId = batch.id.toString();
        req.query.businessId = batch.businessId.toString();
        console.log("Using batch:", batch.id, "business:", batch.businessId);
    }
    
    await afterSeminarRetentionController.getRetentionCampaignData(req, res);
}
run();
