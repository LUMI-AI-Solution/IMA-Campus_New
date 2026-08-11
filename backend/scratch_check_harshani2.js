const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const harshaniId = 49;
  
  const leadsByCampaign = await prisma.lead.groupBy({
    by: ['campaignType'],
    where: { assignedTo: harshaniId },
    _count: {
      id: true
    }
  });
  
  console.log("Leads for Harshani grouped by Campaign Type:", leadsByCampaign);

  const leadsByStatus = await prisma.lead.groupBy({
    by: ['status'],
    where: { assignedTo: harshaniId },
    _count: {
      id: true
    }
  });
  
  console.log("Leads for Harshani grouped by Status:", leadsByStatus);
  
  // also check if maybe she is assigned in LeadRoundProgress instead of Lead directly, 
  // or maybe there is another table.
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
