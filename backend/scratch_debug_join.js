const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const controller = require('./controllers/afterSeminarRetentionController');

async function test() {
    const req = {
        query: { batchId: '5' }
    };
    const res = {
        status: (code) => ({
            json: (data) => {
                console.log(data.monthlyGroups.map(g => g.name));
            }
        })
    };
    await controller.getRetentionCampaignData(req, res);
}
test().catch(console.error).finally(() => prisma.$disconnect());
