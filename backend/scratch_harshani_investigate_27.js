const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cutoffTime = new Date('2026-07-14T03:23:00Z'); // just before my script ran
  
  console.log("Reverting leads updated after", cutoffTime);
  
  const result = await prisma.lead.updateMany({
    where: { updatedAt: { gte: cutoffTime } },
    data: {
      openSemCallStatus: 'pending',
      openSemCallAttempt: 1,
      openSemRound: 1,
      openSemPhase: 1,
      
      newInqCallStatus: 'pending',
      newInqCallAttempt: 1,
      newInqRound: 1,
      newInqPhase: 1,
      
      paidCallStatus: 'pending',
      paidCallAttempt: 1,
      paidRound: 1,
      paidPhase: 1
    }
  });
  
  console.log(`Reverted ${result.count} leads to pending state!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
