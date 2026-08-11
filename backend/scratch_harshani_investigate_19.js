const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const date7DaysAgo = new Date();
  date7DaysAgo.setDate(date7DaysAgo.getDate() - 7);

  const recentHarshaniLeads = await prisma.lead.findMany({
    where: { 
      campaignType: 'AFTER_SEMINAR',
      assignedTo: 49,
      assignedAt: { gte: date7DaysAgo }
    },
    select: { batchId: true, inquiryType: true }
  });

  console.log(`Total AFTER_SEMINAR leads assigned to Harshani in last 7 days across ALL batches: ${recentHarshaniLeads.length}`);
  
}

main().catch(console.error).finally(() => prisma.$disconnect());
