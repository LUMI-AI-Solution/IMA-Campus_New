const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const replies = await prisma.autoReply.findMany({
      where: { businessId: 13, campaignType: 'AFTER_SEMINAR' },
      orderBy: { createdAt: 'desc' }
  });
  console.log(replies);
}
main().finally(() => prisma.$disconnect());
