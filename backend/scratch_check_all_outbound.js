const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const outboundLogs = await prisma.whatsAppCallRecord.findMany({
    where: {
      direction: 'OUTBOUND'
    },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  console.log('Total OUTBOUND logs count:', await prisma.whatsAppCallRecord.count({ where: { direction: 'OUTBOUND' } }));
  console.log('Outbound logs:', outboundLogs);
}

main().finally(() => prisma.$disconnect());
