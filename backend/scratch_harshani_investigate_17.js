const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allHarshaniLeads = await prisma.lead.findMany({
    where: { 
      assignedTo: 49
    },
    select: { id: true, batchId: true, campaignType: true }
  });

  const campaignCounts = allHarshaniLeads.reduce((acc, lead) => {
    acc[lead.campaignType] = (acc[lead.campaignType] || 0) + 1;
    return acc;
  }, {});
  console.log("Total Harshani Leads by Campaign:", campaignCounts);

  const batchCounts = allHarshaniLeads.reduce((acc, lead) => {
    acc[lead.batchId] = (acc[lead.batchId] || 0) + 1;
    return acc;
  }, {});
  console.log("Total Harshani Leads by Batch:", batchCounts);

}

main().catch(console.error).finally(() => prisma.$disconnect());
