require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const callCampaignAuditController = require('./controllers/callCampaignAuditController');

async function test() {
  const req = {
    query: {
      page: 1, limit: 50, search: '', campaignCategory: 'ALL', coordinatorId: 'ALL', businessType: 'ALL', batchId: 'ALL'
    }
  };
  const res = {
    status: (code) => ({
      json: (data) => console.log(JSON.stringify(data, null, 2))
    })
  };

  await callCampaignAuditController.getLiveCampaignLeads(req, res);
  process.exit(0);
}
test();
