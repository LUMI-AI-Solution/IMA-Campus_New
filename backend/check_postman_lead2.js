const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const leads = await prisma.lead.findMany({
    where: { name: 'Postman Test User' },
    orderBy: { createdAt: 'desc' }
  });
  console.log("Postman Leads:", leads.map(l => ({ phone: l.phone, name: l.name, campaignType: l.campaignType, time: l.createdAt })));
}
run();
