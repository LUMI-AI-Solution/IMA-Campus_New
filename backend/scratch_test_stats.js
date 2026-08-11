const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const businessId = "clxvq2zz80005dps11c1d81z2"; // replace with a real one or just query first lead's businessId
  const lead = await prisma.lead.findFirst({ where: { inquiryType: 'NEW_INQ' } });
  if(!lead) {
     console.log("no lead"); return;
  }
  console.log("businessId:", lead.businessId);
}
run();
