const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dateStr = '2026-08-02';
  const startOfDay = new Date(dateStr);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateStr);
  endOfDay.setHours(23, 59, 59, 999);

  const outboundLogs = await prisma.whatsAppCallRecord.findMany({
    where: {
      createdAt: { gte: startOfDay, lte: endOfDay },
      direction: 'OUTBOUND'
    },
    include: {
      agent: { select: { firstName: true, lastName: true } },
      business: { select: { name: true, logo: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Outbound logs count for ${dateStr}:`, outboundLogs.length);
  console.log('Outbound logs:', JSON.stringify(outboundLogs, null, 2));
}

main().finally(() => prisma.$disconnect());
