const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const harshaniId = 49;
  
  const inquiryTypes = await prisma.lead.groupBy({
      by: ['inquiryType'],
      where: { assignedTo: harshaniId, campaignType: 'FREE_SEMINAR' },
      _count: { id: true }
  });
  
  console.log("Inquiry Types for Harshani's FREE_SEMINAR leads:", inquiryTypes);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
