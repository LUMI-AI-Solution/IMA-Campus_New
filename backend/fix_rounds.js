const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leadsToFix = await prisma.lead.findMany({
    where: {
      campaignType: 'AFTER_SEMINAR',
      coordinationRound: 2,
      newInqRound: 1,
      newInqFeedback: { contains: 'Auto pushed from Round 1' }
    }
  });

  console.log(`Found ${leadsToFix.length} NEW_INQ leads to fix.`);

  let fixedNewInq = 0;
  for (const lead of leadsToFix) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        newInqRound: 2,
        newInqPhase: 1,
        newInqCallStatus: 'pending'
      }
    });
    fixedNewInq++;
  }
  
  const leadsToFixOpenSem = await prisma.lead.findMany({
    where: {
      campaignType: 'AFTER_SEMINAR',
      coordinationRound: 1,
      openSemRound: 1,
      inquiryType: 'NORMAL',
      openSemFeedback: { contains: 'Auto pushed from Round 2' },
      newInqRound: { lt: 3 }
    }
  });
  
  console.log(`Found ${leadsToFixOpenSem.length} OpenSem leads to fix (from Round 2 push).`);
  let fixedOpenSem = 0;
  for (const lead of leadsToFixOpenSem) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        newInqRound: 3,
        newInqPhase: 1
      }
    });
    fixedOpenSem++;
  }

  console.log(`Successfully fixed ${fixedNewInq} NEW_INQ leads and ${fixedOpenSem} OpenSem leads.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
