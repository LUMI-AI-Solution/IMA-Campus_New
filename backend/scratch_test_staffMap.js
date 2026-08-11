const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const leads = await prisma.lead.findMany({ 
    where: { inquiryType: 'NEW_INQ' },
    include: { assignedUser: true }
  });
  
  let totalAssigned = 0;
  let r1Assigned = 0;
  let r2Assigned = 0;
  let neAssigned = 0;
  let paidAssigned = 0;
  
  const now = new Date();
  
  leads.forEach(l => {
    if (l.assignedTo) {
      totalAssigned++;
      
      const isEnrolled = l.enrollmentStatus === 'ENROLLED' || l.enrollmentStatus === 'PAID';
      const round = l.newInqRound || 1;
      const assignedDaysPassed = (now - new Date(l.assignedAt || l.createdAt)) / (1000 * 60 * 60 * 24);
      
      if (isEnrolled) {
        paidAssigned++;
      } else if (assignedDaysPassed >= 7 || round === 'NON_ENROLLED' || l.enrollmentStatus === 'NON_ENROLLED') {
        neAssigned++;
      } else if (round === 2) {
        r2Assigned++;
      } else {
        r1Assigned++;
      }
    }
  });
  
  console.log(`totalAssigned: ${totalAssigned}`);
  console.log(`r1: ${r1Assigned}`);
  console.log(`r2: ${r2Assigned}`);
  console.log(`ne: ${neAssigned}`);
  console.log(`paid: ${paidAssigned}`);
}
run();
