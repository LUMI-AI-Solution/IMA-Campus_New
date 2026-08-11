const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const leads = await prisma.lead.findMany({
      where: { 
          phone: { startsWith: '94714941559' },
          campaignType: 'AFTER_SEMINAR'
      }
  });
  console.log(leads.map(l => ({ id: l.id, phone: l.phone, autoReplyStep: l.autoReplyStep, updatedAt: l.updatedAt, isOptedOut: l.isOptedOut, sequenceCompleted: l.sequenceCompleted })));
}
main().finally(() => prisma.$disconnect());
