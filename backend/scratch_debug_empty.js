const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const controller = require('./controllers/afterSeminarRetentionController');

async function test() {
    const req = {
        query: {
            batchId: '5',
            targetMonthName: 'Monthly Payment - MAY'
        }
    };
    const res = {
        status: (code) => ({
            json: (data) => {
                const leads = data.leads;
                console.log("Total leads returned:", leads.length);
                const nonEnrolled = leads.filter(l => l.enrollmentStatus === 'NON_ENROLLED');
                const enrolled = leads.filter(l => l.enrollmentStatus === 'ENROLLED');
                console.log("Enrolled:", enrolled.length, "Non-Enrolled:", nonEnrolled.length);
            }
        })
    };
    await controller.getRetentionCampaignData(req, res);
}
test().catch(console.error).finally(() => prisma.$disconnect());
