const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const date7DaysAgo = new Date();
  date7DaysAgo.setDate(date7DaysAgo.getDate() - 7);

  const recentHarshaniLeads = await prisma.lead.findMany({
    where: { 
      campaignType: 'AFTER_SEMINAR',
      assignedTo: 49,
      assignedAt: { gte: date7DaysAgo },
      batchId: { not: 26 }
    },
    select: { batchId: true, inquiryType: true, id: true }
  });

  const batchCounts = recentHarshaniLeads.reduce((acc, lead) => {
    acc[lead.batchId] = (acc[lead.batchId] || 0) + 1;
    return acc;
  }, {});
  
  console.log("Other batches for recent leads:", batchCounts);

  const updatedOtherLeads = await prisma.lead.updateMany({
    where: { 
      campaignType: 'AFTER_SEMINAR',
      assignedTo: { not: null },
      assignedAt: { gte: date7DaysAgo },
      batchId: { not: 26 },
      inquiryType: 'NEW_INQ'
    },
    data: {
      inquiryType: 'OPEN_SEMINAR'
    }
  });
  console.log(`Updated ${updatedOtherLeads.count} OTHER NEW_INQ leads to OPEN_SEMINAR across ALL batches recently assigned to ANYONE.`);
  
}

main().catch(console.error).finally(() => prisma.$disconnect());
