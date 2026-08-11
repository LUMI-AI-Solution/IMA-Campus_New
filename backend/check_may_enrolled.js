const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const { getRetentionLeads } = require('./controllers/afterSeminarRetentionController');
  
  // mock request
  const req = {
    query: { businessId: '1', batchId: '5', tab: 'MONTHLY', targetMonthName: 'Monthly Payment - MAY' }
  };
  const res = {
    status: (code) => ({
      json: (data) => console.log(JSON.stringify(data.leads.map(l => l.phone), null, 2))
    })
  };
  
  // Need to mock the export? No, let's just fetch the data directly using the same logic.
  // Actually, getRetentionLeads doesn't do the evaluation, it just fetches CRM leads!
  // Wait! getCampaignData is the one that evaluates!
  
  const { getCampaignData } = require('./controllers/afterSeminarRetentionController');
  const req2 = {
    query: { businessId: '1', batchId: '5', targetMonthName: 'Monthly Payment - MAY' }
  };
  const res2 = {
    status: (code) => ({
      json: (data) => {
        const leads = data.leads.filter(l => l.phone.includes('000000008'));
        console.log("Leads for 000000008 in MAY:", JSON.stringify(leads, null, 2));
      }
    })
  };
  
  await getCampaignData(req2, res2);
}
main().finally(() => prisma.$disconnect());
