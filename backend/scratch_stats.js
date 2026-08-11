const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.whatsAppCallRecord.findMany({ 
    take: 5,
    include: { business: true }
  });
  console.log(JSON.stringify(records.map(r => ({ id: r.id, bizId: r.businessId, biz: r.business })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
