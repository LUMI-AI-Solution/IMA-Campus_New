const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.whatsAppCallRecord.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log('WhatsAppCallRecord count:', await prisma.whatsAppCallRecord.count());
  console.log('Sample records:', records);
}

main().finally(() => prisma.$disconnect());
