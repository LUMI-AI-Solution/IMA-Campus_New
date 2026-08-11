const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const afterSeminarRetentionController = require('./controllers/afterSeminarRetentionController');

async function run() {
    const req = {
        query: {
            businessId: '6',
            batchId: '12',
            targetMonthName: 'Monthly Payment - JULY'
        }
    };
    const res = {
        status: () => res,
        json: (data) => {
            const lead = data.leads.find(l => l.phone.includes('773114092'));
            if (lead) {
                console.log("enrollmentStatus:", lead.enrollmentStatus);
            }
        }
    };
    await afterSeminarRetentionController.getRetentionCampaignData(req, res);
}
run();
