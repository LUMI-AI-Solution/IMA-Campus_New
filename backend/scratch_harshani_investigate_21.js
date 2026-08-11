const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const harshaniLeads = await prisma.lead.findMany({
    where: { 
      batchId: 26,
      campaignType: 'AFTER_SEMINAR',
      assignedTo: 49
    },
    select: { id: true, phone: true }
  });

  const leadIds = harshaniLeads.map(l => l.id);
  
  const progressRecords = await prisma.leadRoundProgress.findMany({
    where: { leadId: { in: leadIds } }
  });

  console.log(`Found ${progressRecords.length} LeadRoundProgress records for Harshani's 57 leads!`);
  
  const categoryCounts = progressRecords.reduce((acc, p) => {
    acc[p.campaignCategory] = (acc[p.campaignCategory] || 0) + 1;
    return acc;
  }, {});
  console.log("Categories:", categoryCounts);
  
  const statusCounts = progressRecords.reduce((acc, p) => {
    acc[p.callStatus] = (acc[p.callStatus] || 0) + 1;
    return acc;
  }, {});
  console.log("Statuses in LeadRoundProgress:", statusCounts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
