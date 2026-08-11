const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const harshaniId = 49;
  
  const leadsCount = await prisma.lead.groupBy({
      by: ['callCenterRequestStatus'],
      where: { assignedTo: harshaniId, campaignType: 'FREE_SEMINAR' },
      _count: { id: true }
  });
  
  console.log("Call Center Request Status for Harshani's FREE_SEMINAR leads:", leadsCount);

  const totalAssignedLeadsCount = await prisma.lead.count({
    where: { assignedTo: harshaniId, campaignType: 'FREE_SEMINAR', status: 'OPEN' }
  });
  console.log("Total ASSIGNED FREE_SEMINAR OPEN leads:", totalAssignedLeadsCount);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
