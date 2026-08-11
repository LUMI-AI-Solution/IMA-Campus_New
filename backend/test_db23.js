const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const autoReplies = await prisma.autoReply.findMany({
      where: { businessId: 13, campaignType: 'AFTER_SEMINAR' },
      orderBy: { stepOrder: 'asc' }
  });
  console.log(autoReplies.map(r => ({ id: r.id, stepOrder: r.stepOrder })));
}
main().finally(() => prisma.$disconnect());
