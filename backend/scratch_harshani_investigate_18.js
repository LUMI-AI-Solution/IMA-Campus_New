const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const date7DaysAgo = new Date();
  date7DaysAgo.setDate(date7DaysAgo.getDate() - 7);

  const missingBatchLeads = await prisma.lead.findMany({
    where: { 
      batchId: null,
      campaignType: 'AFTER_SEMINAR',
      assignedTo: 49,
      assignedAt: { gte: date7DaysAgo }
    }
  });

  console.log(`Harshani leads with batchId=null assigned in last 7 days: ${missingBatchLeads.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
