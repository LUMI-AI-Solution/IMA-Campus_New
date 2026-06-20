const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const leads = await prisma.lead.findMany({ where: { campaignType: 'FREE_SEMINAR' }, select: { id: true, name: true, phone: true, isCallCenter: true, callCenterRequestStatus: true, assignedTo: true, status: true, callStatus: true } });
  console.log(leads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
