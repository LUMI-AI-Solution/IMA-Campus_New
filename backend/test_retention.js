const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const httpMocks = require('node-mocks-http');
const retentionController = require('./controllers/afterSeminarRetentionController');

async function test() {
    const req = httpMocks.createRequest({
        method: 'GET',
        url: '/api/after-seminar-crm/retention/campaign-data',
        query: {
            businessId: '6',
            batchId: '12',
            targetMonthName: 'Monthly Payment - JULY'
        }
    });
    const res = httpMocks.createResponse();

    await retentionController.getRetentionCampaignData(req, res);

    const data = res._getJSONData();
    console.log("targetMonthName:", req.query.targetMonthName);
    console.log("coordinationMonths:", data.coordinationMonths);
    console.log("monthlyGroups:", data.monthlyGroups);
    console.log("defaultActiveGroupName:", data.defaultActiveGroupName);
    
    if (data.leads) {
        console.log("Total leads:", data.leads.length);
        const dropped = data.leads.filter(l => l.hasDroppedSubjects);
        console.log("Dropped leads:", dropped.length);
        if (dropped.length > 0) {
            console.log("First dropped lead:");
            console.log("Base Subjects:", dropped[0].enrolledSubjects);
            console.log("Payment History:", JSON.stringify(dropped[0].paymentHistory, null, 2));
            console.log("Dropped Subjects:", dropped[0].droppedSubjectsList);
        } else if (data.leads.length > 0) {
            console.log("Sample lead 0 payment history:");
            console.log(JSON.stringify(data.leads[0].paymentHistory, null, 2));
            console.log("Sample lead 0 hasDroppedSubjects:", data.leads[0].hasDroppedSubjects);
            console.log("Sample lead 0 droppedSubjectsList:", data.leads[0].droppedSubjectsList);
            console.log("Sample lead 0 targetGroupIndex:", data.leads[0].targetGroupIndex); // Oops, this is not exposed
        }
    }
}
test().catch(console.error).finally(() => prisma.$disconnect());
