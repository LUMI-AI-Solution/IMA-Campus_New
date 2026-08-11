const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const leads = await prisma.lead.findMany({ 
    where: { inquiryType: 'NEW_INQ' },
    take: 10
  });
  leads.forEach(l => {
    console.log(`Lead ${l.id} - newInqRound: ${l.newInqRound} (type: ${typeof l.newInqRound}), enrollmentStatus: ${l.enrollmentStatus}`);
  });
}
run();
