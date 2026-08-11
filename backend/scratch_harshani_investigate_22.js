const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const answeredProgress = await prisma.leadRoundProgress.findFirst({
    where: { 
      callStatus: 'answered', 
      campaignCategory: { in: ['DEFAULT', 'NEW_INQ'] },
      lead: { assignedTo: 49, batchId: 26, campaignType: 'AFTER_SEMINAR' }
    },
    include: { lead: true }
  });

  if (answeredProgress) {
    console.log("Found an 'answered' progress record!");
    console.log("Progress Record:", answeredProgress);
    console.log("Lead Record call statuses:", {
      callStatus: answeredProgress.lead.callStatus,
      openSemCallStatus: answeredProgress.lead.openSemCallStatus,
      newInqCallStatus: answeredProgress.lead.newInqCallStatus
    });
  } else {
    console.log("No answered progress found");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
